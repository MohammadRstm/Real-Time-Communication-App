using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using server_dotnet.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace server_dotnet.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            // Add user to their own group for personal messages
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendNotification(string receiverId , string notificationMessage)
        {
            try
            {
                await Clients.Group(receiverId).SendAsync("ReceiveNotification", notificationMessage);
            }catch(Exception ex)
            {
                await Clients.Caller.SendAsync("Error", ex.Message);
            }
        }


        // Get user ID from claims
        private string GetUserId()
        {
            return Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? throw new UnauthorizedAccessException("User not authenticated");
        }



    }
}
