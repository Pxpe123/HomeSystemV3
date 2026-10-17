using System.Diagnostics;
using System.Management;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using PcAgent.Models;

namespace PcAgent;

/// <summary>
/// Collects system hardware stats (CPU, RAM, disk, network).
/// Uses WMI and performance counters on Windows.
/// </summary>
public class SystemMonitor
{
    private PerformanceCounter? _cpuCounter;

    public void Initialize()
    {
        try
        {
            _cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
            _cpuCounter.NextValue(); // first call always returns 0
        }
        catch
        {
            // Performance counters may not be available
        }
    }

    /// <summary>
    /// Takes a snapshot of all system stats.
    /// </summary>
    public PcAgentStates Collect()
    {
        var states = new PcAgentStates
        {
            Status = PcAgentStatus.Online,
            System = CollectSystem(),
            Cpu = CollectCpu(),
            Memory = CollectMemory(),
            Disks = CollectDisks(),
            Networks = CollectNetworks()
        };

        return states;
    }

    private PcAgentStates.SystemStats CollectSystem()
    {
        return new PcAgentStates.SystemStats
        {
            Hostname = Environment.MachineName,
            OsName = RuntimeInformation.OSDescription,
            OsVersion = Environment.OSVersion.ToString(),
            Architecture = RuntimeInformation.OSArchitecture.ToString(),
            Uptime = TimeSpan.FromMilliseconds(Environment.TickCount64),
            LastBootTime = DateTime.UtcNow - TimeSpan.FromMilliseconds(Environment.TickCount64)
        };
    }

    private PcAgentStates.CpuStats CollectCpu()
    {
        var stats = new PcAgentStates.CpuStats
        {
            LogicalProcessors = Environment.ProcessorCount
        };

        try
        {
            if (_cpuCounter != null)
                stats.UsagePercent = _cpuCounter.NextValue();
        }
        catch { }

        // Get CPU name and clock from WMI
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT NumberOfCores, MaxClockSpeed FROM Win32_Processor");
            foreach (var obj in searcher.Get())
            {
                stats.Cores = Convert.ToInt32(obj["NumberOfCores"]);
                stats.BaseClockMHz = Convert.ToInt32(obj["MaxClockSpeed"]);
                break;
            }
        }
        catch { }

        return stats;
    }

    private static PcAgentStates.MemoryStats CollectMemory()
    {
        var stats = new PcAgentStates.MemoryStats();

        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT TotalVisibleMemorySize, FreePhysicalMemory FROM Win32_OperatingSystem");
            foreach (var obj in searcher.Get())
            {
                var totalKb = Convert.ToInt64(obj["TotalVisibleMemorySize"]);
                var freeKb = Convert.ToInt64(obj["FreePhysicalMemory"]);
                stats.TotalMb = totalKb / 1024;
                stats.UsedMb = (totalKb - freeKb) / 1024;
                break;
            }
        }
        catch { }

        return stats;
    }

    private static List<PcAgentStates.DiskStats> CollectDisks()
    {
        var disks = new List<PcAgentStates.DiskStats>();

        try
        {
            foreach (var drive in DriveInfo.GetDrives())
            {
                if (!drive.IsReady) continue;

                disks.Add(new PcAgentStates.DiskStats
                {
                    DriveLetter = drive.Name.TrimEnd('\\'),
                    DriveType = drive.DriveType.ToString(),
                    TotalMb = drive.TotalSize / (1024 * 1024),
                    UsedMb = (drive.TotalSize - drive.AvailableFreeSpace) / (1024 * 1024)
                });
            }
        }
        catch { }

        return disks;
    }

    private static List<PcAgentStates.NetworkStats> CollectNetworks()
    {
        var networks = new List<PcAgentStates.NetworkStats>();

        try
        {
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.OperationalStatus != OperationalStatus.Up) continue;
                if (nic.NetworkInterfaceType is NetworkInterfaceType.Loopback or NetworkInterfaceType.Tunnel)
                    continue;

                var ipProps = nic.GetIPProperties();
                var ipv4 = ipProps.UnicastAddresses
                    .FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork);

                if (ipv4 == null) continue;

                var connectionType = nic.NetworkInterfaceType switch
                {
                    NetworkInterfaceType.Wireless80211 => "WiFi",
                    NetworkInterfaceType.Ethernet => "Ethernet",
                    _ => nic.NetworkInterfaceType.ToString()
                };

                networks.Add(new PcAgentStates.NetworkStats
                {
                    AdapterName = nic.Name,
                    MacAddress = nic.GetPhysicalAddress().ToString(),
                    LocalIp = ipv4.Address.ToString(),
                    ConnectionType = connectionType
                });
            }
        }
        catch { }

        return networks;
    }
}
