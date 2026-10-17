using System.Collections.Concurrent;
using System.Text.Encodings.Web;

namespace CentralServer.Modules.EndPoints.Spotify;

/// <summary>Phone-only receipt. It does not need WebUI setup, a profile session or provider credentials.</summary>
public static class SpotifyCallbackPage
{
    private sealed record Receipt(string Name, DateTime ExpiresUtc);
    private static readonly ConcurrentDictionary<string, Receipt> Receipts = new();
    public static void ClearReceipts() => Receipts.Clear();
    public static string CreateReceipt(string name)
    {
        foreach (var expired in Receipts.Where(item => item.Value.ExpiresUtc < DateTime.UtcNow).ToArray()) Receipts.TryRemove(expired.Key, out _);
        var id = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(24));
        Receipts[id] = new(name, DateTime.UtcNow.AddMinutes(5));
        return id;
    }
    public static void Map(WebApplication app) => app.MapGet("/Spotify/Connected", async context =>
    {
        var receipt = context.Request.Query["receipt"].ToString();
        var valid = Receipts.TryRemove(receipt, out var saved) && saved.ExpiresUtc > DateTime.UtcNow;
        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.Headers.CacheControl = "no-store";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'";
        var title = valid ? "Spotify connected" : "Connection receipt expired";
        var message = valid ? $"Spotify is saved for {HtmlEncoder.Default.Encode(saved!.Name)} on your home server. Your home display will update automatically."
            : "This page does not confirm a new connection. Check Spotify on your home display.";
        await context.Response.WriteAsync($$"""
            <!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>{{title}} · HomeSystem</title><style>
            :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at top left,#204a52,#101c30 70%);color:#fff;font:16px/1.7 system-ui,sans-serif}
            main{max-width:460px;padding:36px;border:1px solid #ffffff24;border-radius:24px;background:#ffffff0c;text-align:center}svg{width:64px;fill:#89dbd0}h1{font-size:28px;font-weight:500;line-height:1.2}p{color:#c6d3df}small{display:block;margin-top:28px;color:#89dbd0}
            </style></head><body><main><svg aria-label="Spotify" role="img" viewBox="0 0 24 24"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.5 17.3c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1.1-.4.1-.7-.2-.8-.5-.1-.4.2-.7.5-.8 4.1-.9 7.6-.5 10.3 1.2.3.2.4.6.2 1zm1.4-3c-.3.4-.8.5-1.1.3-2.9-1.8-7.2-2.3-10.5-1.3-.4.1-.9-.1-1-.5-.1-.5.1-.9.5-1.1 3.9-1.1 8.6-.6 11.8 1.4.4.2.5.7.3 1.2zm.1-3.2c-3.4-2-9.1-2.2-12.4-1.2-.5.1-1-.1-1.2-.6-.1-.5.2-1 .7-1.2 3.8-1.1 10.1-.9 13.9 1.4.5.3.6.9.3 1.3-.3.5-.8.6-1.3.3z"/></svg>
            <h1>{{title}}</h1><p>{{message}}</p><small>You can close this tab on your phone.</small></main></body></html>
            """);
    });
}
