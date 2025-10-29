using Microsoft.AspNetCore.SignalR;

namespace server_dotnet.Hubs
{
    public class CanvasDrawingHub : Hub
    {

        public class CanvasPoint
        {
            public float X { get; set; }
            public float Y { get; set; }
            public string Type { get; set; } // e.g. "draw", "start", "end"
        }

        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        public async Task JoinRoom(string roomCode)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);
        }

        public async Task LeaveRoom(string roomCode)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomCode);
        }
        public async Task SendCanvasData(string roomCode , CanvasPoint data)
        {
            await Clients.Group(roomCode).SendAsync("ReceiveCanvasData", data);
        }
        
    }
}
