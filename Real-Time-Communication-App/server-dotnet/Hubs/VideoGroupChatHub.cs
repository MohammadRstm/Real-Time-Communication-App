using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace server_dotnet.Hubs
{
    [Authorize]
    public class VideoGroupChatHub : Hub
    {
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

        public async Task SendGroupChatMessage(string roomCode, string message)
        {
            var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub);

            var msg = new
            {
                senderId = userId,
                message,
                sentAt = DateTime.UtcNow
            };

            await Clients.Group(roomCode).SendAsync("VideoGroupChatMessage", msg);
        }
    }
}
