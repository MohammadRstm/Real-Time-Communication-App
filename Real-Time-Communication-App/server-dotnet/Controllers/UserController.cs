using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server_dotnet.DTOs;
using server_dotnet.Models;
using server_dotnet.Services;
using System.Diagnostics.Contracts;
using System.IdentityModel.Tokens.Jwt;
using System.Linq.Expressions;
using System.Security.Claims;

namespace server_dotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly UserService _userService;
        private readonly TokenService _tokenService;

        public UserController(UserService userService, TokenService tokenService)
        {
            _userService = userService;
            _tokenService = tokenService;
        }

        [Authorize]
        [HttpGet("getUserDetails/{id?}")]
        public async Task<IActionResult> GetUserDetails(string id = null)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

                if (!string.IsNullOrEmpty(id))
                {
                    userId = id;
                }
        

                var userInfo = await _userService.GetUserById(userId);
                if (userInfo == null)
                    return NotFound(new { message = "User not found" });

                // Gather all friend info concurrently
                var friendTasks = userInfo.Friends.Select(async friendId =>
                {
                    var friendInfo = await _userService.GetUserById(friendId);
                    return new
                    {
                        friendInfo.Id,
                        friendInfo.FullName,
                        friendInfo.Email,
                        profile = friendInfo.Profile
                    };
                });

                var friends = await Task.WhenAll(friendTasks);

                var userDetails = new
                {
                    fullName = userInfo.FullName,
                    email = userInfo.Email,
                    profile = userInfo.Profile,
                    friends
                };

                return Ok(userDetails);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Server error, please try again later.",
                    error = ex.Message
                });
            }
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDTO loginDTO)
        {
            try
            {
                // find user by email
                var user = await _userService.GetUserByEmail(loginDTO.Email);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                bool isMatch = BCrypt.Net.BCrypt.Verify(loginDTO.Password, user.Password);
                if (!isMatch)
                {
                    return Unauthorized(new { message = "Wrong credentials" });
                }

                var token = _tokenService.GenerateToken(user.Id, user.Email , user.FullName);

                return Ok(new LoginResponseDTO
                {
                    Message = "Login Successful",
                    Token = token,
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Server error , please try agian later", error = ex.Message });
            }
        }

        [HttpPost("signup")]
        public async Task<IActionResult> Register([FromBody] RegisterDTO registerDTO)
        {
            try
            {
                var user = await _userService.GetUserByEmail(registerDTO.Email);
                if (user != null) return StatusCode(401, new { message = "This email is already in use by another user" });

                string hashedPassword = BCrypt.Net.BCrypt.HashPassword(registerDTO.Password, 10);// 10 SALT_ROUNDS

                var newUser = new Models.User{
                    FullName = registerDTO.FullName,
                    Email = registerDTO.Email,
                    Password = hashedPassword
                };

                await _userService.CreateNewUserAsync(newUser);
                return Ok(new { message = "User registered successfully" });
            } catch (Exception ex)
            {
                return StatusCode(500, new { message = "Server error , please try again later", error = ex.Message });
            }
        }

        [HttpGet("suggestions/{searchString}")]
        [Authorize]
        public async Task<IActionResult> GetUserSuggestions(string? searchString)
        {
            try
            {
                if (string.IsNullOrEmpty(searchString)) return Ok(new List<object>());

                var users = await _userService.GetUserSuggestions(searchString);

                return Ok(users);
            }catch (Exception ex)
            {
                return StatusCode(500, new { message = "Server error , please try again later", error = ex.Message });
            }
        }

        [HttpPost("sendFreindRequest/{requestedUser}")]
        [Authorize]
        public async Task<IActionResult> SendFriendRequest(string requestedUser)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                             User.FindFirstValue(JwtRegisteredClaimNames.Sub);

                var email = User.FindFirstValue(ClaimTypes.Email) ??
                            User.FindFirstValue(JwtRegisteredClaimNames.Email);
                // check if the users are already freinds
                var userFriends = await _userService.GetUserFriends(userId);
                if(userFriends != null && userFriends.Friends.Any(f => f.ToString() == requestedUser))
                {
                    return BadRequest(new { message = "You are already friends with this user" });
                }
                // check if a friend request is already sent
                var targetedUser = await _userService.GetUserById(requestedUser);
                if (targetedUser != null && targetedUser.FriendRequests.Any(r => r.From.ToString() == userId))
                {
                    return BadRequest(new { message = "Already sent a friend request" });
                }

                // Send Friend request

                targetedUser.FriendRequests.Add(new FriendRequests
                {
                    From = userId,
                    SentAt = DateTime.UtcNow
                });
                await _userService.UpdateUserInfo(targetedUser);

                return Ok(new {message = "Friend request send successfully"});
            }catch(Exception ex)
            {
                return StatusCode(500, new { message = "Server error , please try again later", error = ex.Message });
            }
        }

        [HttpGet("friendRequests")]
        [Authorize]
        public async Task<IActionResult> GetAllFreindRequests()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                             User.FindFirstValue(JwtRegisteredClaimNames.Sub);

                var userData = await _userService.GetUserById(userId);
                if(userData != null)
                {
                    return Ok(userData.FriendRequests);
                }
                else
                {
                    return NotFound(new { message = "User not found" });
                }
            }catch(Exception ex)
            {
                return StatusCode(500, new { message = "Server error , please try again later", error = ex.Message });
            }
        }

        [HttpPost("acceptFriendRequest/{senderId}")]
        [Authorize]
        public async Task<IActionResult> AcceptFriendRequest(string senderId)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                      User.FindFirstValue(JwtRegisteredClaimNames.Sub);

                await _userService.AcceptFreindRequest(userId, senderId);
                return Ok(new {message = "Accepted friend request"});
            }
            catch(Exception ex)
            {
                return StatusCode(500, new { message = "Server error , please try again later", error = ex.Message });
            }
        }

        [HttpPost("rejectFriendRequest/{senderId}")]
        [Authorize]
        public async Task<IActionResult> RejectFriendRequest(string senderId)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                      User.FindFirstValue(JwtRegisteredClaimNames.Sub);

                await _userService.RejectFriendRequest(userId, senderId);
                return Ok(new { message = "Rejected friend request" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Server error , please try again later", error = ex.Message });
            }
        }

        [HttpGet("friends")]
        [Authorize]
        public async Task<IActionResult> GetAllUserFriends()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                             User.FindFirstValue(JwtRegisteredClaimNames.Sub);
                var userData = await _userService.GetUserById(userId);
                if(userData != null)
                {
                    // get freind's details
                    var friendTasks = userData.Friends.Select(async friendId =>
                    {
                        var friendInfo = await _userService.GetUserById(friendId);
                        return new
                        {
                            friendInfo.Id,
                            friendInfo.FullName,
                            friendInfo.Email,
                            profile = friendInfo.Profile
                        };
                    });

                    var friends = await Task.WhenAll(friendTasks);
                    return Ok(friends);
                }
                else
                {
                    return NotFound(new { message = "User not found" });
                }
            }catch(Exception ex)
            {
                return StatusCode(500 , new {message = "Server error , please try again later" , error = ex.Message});
            }
        }

        [HttpPost("uploadProfilePhoto")]
        [Authorize]
        public async Task<IActionResult> UploadProfilePhoto(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                             User.FindFirstValue(JwtRegisteredClaimNames.Sub);

                // Get current user to find existing profile picture
                var user = await _userService.GetUserById(userId);
                if (user == null)
                    return NotFound(new { message = "User not found" });

                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
                if (!Directory.Exists(uploadsFolder))
                    Directory.CreateDirectory(uploadsFolder);

                var uniqueFileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Delete old profile picture if it exists
                if (user.Profile?.PictureUrl != null)
                {
                    var oldPicturePath = Path.Combine(Directory.GetCurrentDirectory(), user.Profile.PictureUrl);
                    if (System.IO.File.Exists(oldPicturePath))
                    {
                        System.IO.File.Delete(oldPicturePath);
                        Console.WriteLine($"Deleted old profile picture: {oldPicturePath}");
                    }
                    else
                    {
                        Console.WriteLine($"Old profile picture not found: {oldPicturePath}");
                    }
                }

                // Return just the filename for the static files middleware
                return Ok(new { filePath = uniqueFileName });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error uploading profile photo", error = ex.Message });
            }
        }

        [HttpPut("updateInfo")]
        [Authorize]
        public async Task<IActionResult> UpdateUserInfo([FromBody] UpdateDTO updateForm)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                             User.FindFirstValue(JwtRegisteredClaimNames.Sub);

                // If a new photo URL is provided, delete the old one
                if (!string.IsNullOrEmpty(updateForm.photo_url))
                {
                    var user = await _userService.GetUserById(userId);
                    if (user?.Profile?.PictureUrl != null && user.Profile.PictureUrl != updateForm.photo_url)
                    {
                        var oldPicturePath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", user.Profile.PictureUrl);
                        if (System.IO.File.Exists(oldPicturePath))
                        {
                            System.IO.File.Delete(oldPicturePath);
                            Console.WriteLine($"Deleted old profile picture during update: {oldPicturePath}");
                        }
                    }
                }

                await _userService.UpdateProfileInfo(updateForm, userId);
                return Ok(new { message = "User info updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Server error, please try again later", error = ex.Message });
            }
        }

    }
}
