using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration.UserSecrets;
using server_dotnet.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using server_dotnet.DTOs;
using server_dotnet.Services;
using Microsoft.AspNetCore.Http.HttpResults;


namespace server_dotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RoomController : ControllerBase
    {
        private readonly RoomService _roomService;
        private IConfiguration _configuration;
        public RoomController(RoomService roomService , IConfiguration configuration)
        {
            _roomService = roomService;
            _configuration = configuration;
        }

        [HttpPost("create")]
        [Authorize]
        public async Task<IActionResult> CreateNewRoom()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                             User.FindFirstValue(JwtRegisteredClaimNames.Sub);


                var roomCode = await _roomService.GenerateUniqueRoomCode();

                var newRoom = new Models.Room
                {
                    RoomCode = roomCode,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow
                };
                await _roomService.CreateRoom(newRoom);

                var frontendBaseUrl = _configuration["FrontendSettings:BaseUrl"];
                var roomLink = $"{frontendBaseUrl}/videoCalling/{newRoom.RoomCode}";

                return Ok(new
                {
                    roomId = newRoom.RoomCode,
                    link = roomLink
                });

            }catch(Exception ex)
            {
                return StatusCode(500, new { message = "Server error , please try again later", error = ex.Message });
            }
        }

        [HttpPost("verify/{code}")]
        [Authorize]
        public async Task<IActionResult> VerifyRoomCode(string code)
        {
            try
            {
                var room = await _roomService.GetRoomByRoomCode(code);
                if (room != null)
                    return Ok(new { exists = true, message = "Room was found" });
                else
                    return NotFound(new { exists = false, message = "Room not found" });
            }catch(Exception ex)
            {
                return StatusCode(500, new { message = "Server error , please try again later", error = ex.Message });
            }
        }

        [HttpPost("upload")]
        [Authorize]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
            if (!Directory.Exists(uploadsPath))
                Directory.CreateDirectory(uploadsPath);

            var uniqueName = $"{Guid.NewGuid()}_{file.FileName}";
            var filePath = Path.Combine(uploadsPath, uniqueName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var fileUrl = $"{Request.Scheme}://{Request.Host}/uploads/{uniqueName}";
            return Ok(new { fileUrl, originalName = file.FileName });
        }

    }
}
