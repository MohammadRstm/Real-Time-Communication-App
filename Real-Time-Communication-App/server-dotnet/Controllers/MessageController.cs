using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server_dotnet.Models;
using server_dotnet.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace server_dotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MessageController : ControllerBase
    {
        private readonly MessageService _messageService;
        private readonly UserService _userService;
        
        public MessageController(MessageService messageService , UserService userService)
        {
            _messageService = messageService;
            _userService = userService;
        }

        [HttpGet("fetchAllMessages/{receiverId}")]
        [Authorize]
        public async Task<IActionResult> FetchAllMessages(string receiverId)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

                var receiverUser = await _userService.GetUserById(receiverId);
                if (receiverUser == null) return NotFound(new {message ="User not found"});

                var messages = await _messageService.GetMessagesAsync(userId , receiverId);
                return Ok(messages);
            }catch(Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("saveMessage/{receiverId}")]
        [Authorize]
        public async Task<IActionResult> SaveMessageSent(string receiverId , [FromBody] string currentMessage)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
                var receiverUser = await _userService.GetUserById(receiverId);
                if (receiverUser == null) return NotFound(new { message = "User not found" });

                await _messageService.SaveMessageAsync(userId, receiverId, currentMessage);
                return Ok(new { message = "Message sent" });
            }catch(Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }


    }
}
