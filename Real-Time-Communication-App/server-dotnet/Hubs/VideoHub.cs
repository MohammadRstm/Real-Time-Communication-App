using Microsoft.AspNetCore.SignalR;
using MongoDB.Driver.Core.Connections;
using server_dotnet.Services;
using System.Collections.Concurrent;

namespace server_dotnet.Hubs
{
    public class VideoHub : Hub
    {
        // ConnectedUsers -> set of connected users to each room 
        private static readonly Dictionary<string, HashSet<string>> RoomUsers = new();

        // roomId -> set of connectionIds
        private static readonly ConcurrentDictionary<string, HashSet<string>> _rooms
            = new ConcurrentDictionary<string, HashSet<string>>();

        // Room Serivice
        private readonly RoomService _roomService;

        public VideoHub(RoomService roomService)
        {
            _roomService = roomService;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.GetHttpContext()?.Request.Query["userId"];
            if (!string.IsNullOrEmpty(userId))
            {
                // Personal group for user (optional)
                await Groups.AddToGroupAsync(Context.ConnectionId, userId);
                Console.WriteLine($"User {userId} joined personal room");
            }
            await base.OnConnectedAsync();
        }

        public async Task JoinRoom(string roomId)
        {
            if (string.IsNullOrWhiteSpace(roomId)) return;

            // Create a list of users connected to current room
            var connectedUser = Context.ConnectionId;
            if (!RoomUsers.ContainsKey(roomId))
            {
                RoomUsers[roomId] = new HashSet<string>(); 
            }
            RoomUsers[roomId].Add(connectedUser);

            // Add connection to SignalR group
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

            // Save the roomId on Context.Items so OnDisconnectedAsync can find it
            Context.Items["roomId"] = roomId;

            // Add to our server-side room dictionary
            var connections = _rooms.GetOrAdd(roomId, _ => new HashSet<string>());
            lock (connections)
            {
                connections.Add(Context.ConnectionId);
            }

            // Prepare list of users (exclude the caller)
            List<string> usersInRoom;
            lock (connections)
            {
                usersInRoom = connections.Where(id => id != Context.ConnectionId).ToList();
            }

            // Send caller the list of other users
            await Clients.Caller.SendAsync("all-users", usersInRoom);

            // Notify others that a new user joined
            await Clients.OthersInGroup(roomId).SendAsync("user-joined", Context.ConnectionId);

            Console.WriteLine($"Socket {Context.ConnectionId} joined {roomId}");
        }

        public async Task LeaveRoom(string roomId)
        {
            if (string.IsNullOrWhiteSpace(roomId)) return;

            // remove user from room's list of connected users 
            var connectedUser = Context.ConnectionId;
            if(RoomUsers.TryGetValue(roomId , out var users))
            {
                users.Remove(connectedUser);
                if(users.Count == 0)
                {
                    // no users left — delete room 
                    await _roomService.DeleteRoom(roomId);
                    // delete files sent during room 
                    await _roomService.DeleteRoomGroupCallFiles(roomId);

                    RoomUsers.Remove(roomId);
                }
            }

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

            if (_rooms.TryGetValue(roomId, out var connections))
            {
                lock (connections)
                {
                    connections.Remove(Context.ConnectionId);
                }

                // Notify others
                await Clients.OthersInGroup(roomId).SendAsync("user-left", Context.ConnectionId);

                // Clean up empty set
                if (connections.Count == 0)
                {
                    _rooms.TryRemove(roomId, out _);
                }
            }

            // Clear context item
            if (Context.Items.ContainsKey("roomId"))
                Context.Items.Remove("roomId");

            Console.WriteLine($"Socket {Context.ConnectionId} left {roomId}");
        }

        // Accept object so SignalR JSON maps to it reliably
        public async Task SendOffer(object offer, string to)
        {
            await Clients.Client(to).SendAsync("offer", new { from = Context.ConnectionId, offer });
        }

        public async Task SendAnswer(object answer, string to)
        {
            await Clients.Client(to).SendAsync("answer", new { from = Context.ConnectionId, answer });
        }

        public async Task SendIceCandidate(object candidate, string to)
        {
            await Clients.Client(to).SendAsync("ice-candidate", new { from = Context.ConnectionId, candidate });
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // Try cleanup by roomId saved in Context.Items
            var roomId = Context.Items.ContainsKey("roomId") ? Context.Items["roomId"] as string : null;

            if (!string.IsNullOrEmpty(roomId) && _rooms.TryGetValue(roomId, out var connections))
            {
                lock (connections)
                {
                    connections.Remove(Context.ConnectionId);
                }

                await Clients.OthersInGroup(roomId).SendAsync("user-left", Context.ConnectionId);

                if (connections.Count == 0)
                {
                    _rooms.TryRemove(roomId, out _);
                }

                Console.WriteLine($"Socket {Context.ConnectionId} left {roomId} (disconnect)");
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}
