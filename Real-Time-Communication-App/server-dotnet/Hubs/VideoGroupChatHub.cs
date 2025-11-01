using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using server_dotnet.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace server_dotnet.Hubs
{
    [Authorize]
    public class VideoGroupChatHub : Hub
    {
        private readonly UserService _userService;

        public VideoGroupChatHub(UserService userService)
        {
            _userService = userService;
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

        public async Task SendGroupChatMessage(string roomCode, string message)
        {
            var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub);

            var user = await _userService.GetUserById(userId);

            var msg = new
            {
                senderId = userId,
                message,
                sentAt = DateTime.UtcNow,
                userFullName = user.FullName,
                userProfilePicture = user.Profile.PictureUrl,
            };

            await Clients.Group(roomCode).SendAsync("VideoGroupChatMessage", msg);
        }
    }
}
