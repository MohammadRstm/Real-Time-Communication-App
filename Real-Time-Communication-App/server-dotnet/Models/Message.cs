using MongoDB.Bson.Serialization.Attributes;

namespace server_dotnet.Models
{
    [BsonIgnoreExtraElements]
    public class Message
    {
        [BsonElement("senderId")]
        public string SenderId { get; set; }

        [BsonElement("receiverId")]
        public string ReveiverId { get; set; }

        [BsonElement("message")]
        public string Text { get; set; }

        [BsonElement("sentAt")]
        public DateTime SentAt = DateTime.UtcNow;

    }
}
