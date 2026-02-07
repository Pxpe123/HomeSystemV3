using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using CentralServer.Modules.Data;

namespace CentralServer.Modules;

public static class PcManager
{
    /// <summary>
    ///     Wake a computer using its MAC address and broadcast IP.
    /// </summary>
    public static void WakeOnLan(string macAddress, string broadcastIp)
    {
        var macBytes = macAddress.Split(':', '-')
            .Select(x => Convert.ToByte(x, 16))
            .ToArray();

        var packet = new byte[102];
        for (var i = 0; i < 6; i++) packet[i] = 0xFF;
        for (var i = 1; i <= 16; i++)
            Buffer.BlockCopy(macBytes, 0, packet, i * 6, 6);

        using var client = new UdpClient();
        client.EnableBroadcast = true;

        // Use the broadcast IP of the LAN, not 255.255.255.255
        client.Send(packet, packet.Length, new IPEndPoint(IPAddress.Parse(broadcastIp), 9));

        if (Globals.DevMode)
            Console.WriteLine($"Sent magic packet to {broadcastIp} for MAC {macAddress}");
    }


    /// <summary>
    ///     Ping a device to check if it's online.
    ///     Returns true if reachable, false if not.
    /// </summary>
    public static bool PcStatus(string ipAddress, int timeoutMs = 2000)
    {
        try
        {
            using var ping = new Ping();
            var reply = ping.Send(ipAddress, timeoutMs);
            return reply != null && reply.Status == IPStatus.Success;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    ///     Attempt to shut down a remote PC.
    /// </summary>
    public static void PowerOff(string ipAddress, string osType = "windows", string user = "", string password = "")
    {
        // NOT YET IMPLEMENTED
        Console.WriteLine("Not Yet Implemented");
    }
}