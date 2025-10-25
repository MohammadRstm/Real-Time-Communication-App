using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using server_dotnet.Configurations;
using server_dotnet.Hubs;
using server_dotnet.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
// Bind mongo db seeting from appsettings.json
builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection("MongoDbSettings"));
// Register mongo db client
builder.Services.AddSingleton<IMongoClient>(s =>
{
    var options = s.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    return new MongoClient(options.ConnectionString);
});
// Register Mongo db
builder.Services.AddSingleton<IMongoDatabase>(s =>
{
    var settings = s.GetRequiredService<IOptions<MongoDbSettings>>().Value;
    var client = s.GetRequiredService<IMongoClient>();
    return client.GetDatabase(settings.DatabaseName);
});

// Register DB Model services
builder.Services.AddSingleton<UserService>();
builder.Services.AddSingleton<RoomService>();
builder.Services.AddSingleton<MessageService>();

// Register Token service
builder.Services.AddSingleton<TokenService>();


// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Enable proper json serialization/deserialization
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
        options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore);

// Integrate JWT Token
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings.GetValue<string>("SecretKey");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.GetValue<string>("Issuer"),
        ValidAudience = jwtSettings.GetValue<string>("Audience"),
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // SignalR sends token via query string: ?access_token=...
            var accessToken = context.Request.Query["access_token"];

            // Check if the request is for your ChatHub endpoint
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/chatHub") || path.StartsWithSegments("/videoHub") || path.StartsWithSegments("/notificationHub")))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
});

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});


// Register signaling package
builder.Services.AddSignalR();

var app = builder.Build();

// --- MongoDB Connection Test ---
try
{
    var mongoDb = app.Services.GetRequiredService<IMongoDatabase>();
    var collections = await mongoDb.ListCollectionNames().ToListAsync();
    Console.WriteLine("✅ MongoDB is connected. Collections found:");
    collections.ForEach(c => Console.WriteLine(" - " + c));
}
catch (Exception ex)
{
    Console.WriteLine("❌ MongoDB connection failed: " + ex.Message);
}

app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "uploads")),
    RequestPath = "/uploads"
});

app.UseRouting();
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// exposes WebSockets endpoints
app.MapHub<VideoHub>("/videoHub");
app.MapHub<ChatHub>("/chatHub").RequireAuthorization();
app.MapHub<NotificationHub>("/notificationHub").RequireAuthorization();


app.Run();
