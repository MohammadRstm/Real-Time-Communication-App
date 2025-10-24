using MongoDB.Driver;
using server_dotnet.Models;

namespace server_dotnet.Services
{
    public class RoomService
    {
        private readonly IMongoCollection<Room> _rooms;
        private static readonly Random _random = new Random();

        public RoomService(IMongoDatabase database)
        {
            _rooms = database.GetCollection<Room>("Rooms");
        }

        // ✅ Generate random 6-character room code (A-Z, 0-9)
        private string GenerateRoomCode(int length = 6)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[_random.Next(s.Length)]).ToArray());
        }

        // ✅ Generate unique room code (checks database until unique)
        public async Task<string> GenerateUniqueRoomCode(int length = 6)
        {
            string code;
            bool exists = true;

            do
            {
                code = GenerateRoomCode(length);
                var room = await _rooms.Find(r => r.RoomCode == code).FirstOrDefaultAsync();
                exists = room != null;
            }
            while (exists);

            return code;
        }

        // ✅ Create new room
        public async Task CreateRoom(Room room)
        {
            await _rooms.InsertOneAsync(room);
        }

        // ✅ Get room by room code
        public async Task<Room?> GetRoomByRoomCode(string code)
        {
            return await _rooms.Find(r => r.RoomCode == code).FirstOrDefaultAsync();
        }
    }
}

