using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using server_dotnet.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace server_dotnet.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly MessageService _messageService;
        private readonly UserService _userService;

        public ChatHub(MessageService messageService, UserService userService)
        {
            _messageService = messageService;
            _userService = userService;
        }

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

        // Send message to specific user
        public async Task SendMessage(string receiverId, string message)
        {
            try
            {
                var senderId = GetUserId();

                // Save message to database
                await _messageService.SaveMessageAsync(senderId, receiverId, message);

                // Create message object to send to clients
                var messageObj = new
                {
                    SenderId = senderId,
                    ReceiverId = receiverId,
                    Message = message,
                    SentAt = DateTime.UtcNow
                };

                // Send to sender (to update their UI immediately)
                await Clients.Caller.SendAsync("ReceiveMessage", messageObj);

                // Send to receiver if they're connected
                await Clients.Group(receiverId).SendAsync("ReceiveMessage", messageObj);

            }
            catch (Exception ex)
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