using MongoDB.Driver;
using server_dotnet.Models;

namespace server_dotnet.Services
{
    public class MessageService
    {
        private readonly IMongoCollection<Message> _message;

        public MessageService(IMongoDatabase database)
        {
            _message = database.GetCollection<Message>("Messages");
        }

        public async Task<List<Message>> GetMessagesAsync(string senderId , string receiverId)
        {
            try
            {
                var messages = await _message.Find(m =>
                    m.SenderId == senderId && m.ReveiverId == receiverId ||
                    m.ReveiverId == senderId && m.SenderId == receiverId
                    )
                    .SortBy(m => m.SentAt)
                    .ToListAsync();
                return messages;
            }catch(Exception ex)
            {
                Console.WriteLine($"Error retrieving messages: {ex.Message}");
                throw;
            }
        }

        public async Task SaveMessageAsync(string senderid , string receiverId , string message)
        {
            try
            {
                var newMessage = new Message{
                    SenderId = senderid,
                    ReveiverId = receiverId,
                    Text = message,
                    SentAt = DateTime.UtcNow
                };
                await _message.InsertOneAsync(newMessage);
            }catch(Exception ex) { Console.WriteLine(ex.ToString()); throw; }
        }

    }
}
