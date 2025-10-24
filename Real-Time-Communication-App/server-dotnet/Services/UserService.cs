using MongoDB.Driver;
using server_dotnet.DTOs;
using server_dotnet.Models;

namespace server_dotnet.Services
{
    public class UserService
    {
        private readonly IMongoCollection<User> _users;

        public UserService(IMongoDatabase database)
        {
            _users = database.GetCollection<User>("Users");
        }

        // Find user by email
        public async Task<User?> GetUserByEmail(string email)
        {
            return await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
        }
        
        // ✅ Create new user
        public async Task CreateNewUserAsync(User user)
        {
            await _users.InsertOneAsync(user);
        }

        // Get users based on search string (suggestions)
        public async Task<List<object>> GetUserSuggestions(string searchString)
        {
            try
            {
            var users = await _users.Find(u => u.FullName.ToLower().Contains(searchString.ToLower()))
                .Project(u => new { u.Id, u.FullName, u.Email })
                .ToListAsync();
            return users.Cast<object>().ToList();
            }catch(Exception ex)
            {
                Console.WriteLine(ex.Message);
            }

            return null;

        }

        // Get user by ID
        public async Task<User?> GetUserById(string id)
        {
            return await _users.Find(u => u.Id == id).FirstOrDefaultAsync();
        }

        // Fetch friend's list of a user
        public async Task<User?> GetUserFriends(string id)
        {
            return await _users.Find(u => u.Id == id)
                               .Project(u => new User { Friends = u.Friends, Id = u.Id })
                               .FirstOrDefaultAsync();
        }

        // Update user info
        public async Task UpdateUserInfo(User user)
        {
            await _users.ReplaceOneAsync(u => u.Id == user.Id, user);
        }
        // Update Profile info
        public async Task UpdateProfileInfo(UpdateDTO updateForm, string userId)
        {
            var user = await GetUserById(userId);
            if (user == null) throw new Exception("User not found");

            // Update basic info
            user.FullName = updateForm.fullName ?? user.FullName;

            // Initialize profile if null
            if (user.Profile == null)
            {
                user.Profile = new Profile();
            }

            // Update profile info
            user.Profile.Bio = updateForm.bio ?? user.Profile.Bio;

            // Only update picture URL if a new one is provided
            if (!string.IsNullOrEmpty(updateForm.photo_url))
            {
                user.Profile.PictureUrl = updateForm.photo_url;
            }

            await UpdateUserInfo(user);
        }
        // Accept Friend Request
        public async Task AcceptFreindRequest(string userId, string senderId)
        {
            var user = await GetUserById(userId);
            var requester = await GetUserById(senderId);

            if (user != null && requester != null)
            {
                // Add both users as friends
                if (!user.Friends.Contains(senderId))
                    user.Friends.Add(senderId);
                if (!requester.Friends.Contains(userId))
                    requester.Friends.Add(userId);

                // Remove request
                user.FriendRequests.RemoveAll(r => r.From == senderId);
                // Remove for requester if exists
                requester.FriendRequests.RemoveAll(r => r.From == userId);

                // Update in DB
                await UpdateUserInfo(user);
                await UpdateUserInfo(requester);
            }
        }

        // Reject Friend Request
        public async Task RejectFriendRequest(string userId, string senderId)
        {
            var requestedUser = await GetUserById(userId);
            if (requestedUser != null)
            {
                requestedUser.FriendRequests.RemoveAll(r => r.From == senderId);
                await UpdateUserInfo(requestedUser);
            }
        }
    }
}
