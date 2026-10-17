using System;
using System.Collections.Generic;

namespace CentralServer.Modules.Data.PcAgent
{
    public enum PcAgentStatus
    {
        Offline,
        Online,
        Busy,
        Error
    }

    public class PcAgentStates
    {
        public PcAgentStatus Status { get; set; } = PcAgentStatus.Offline;

        // 🔹 System information
        public class SystemStats
        {
            public string Hostname { get; set; } = string.Empty;
            public string OsName { get; set; } = string.Empty;
            public string OsVersion { get; set; } = string.Empty;
            public string Architecture { get; set; } = string.Empty;
            public TimeSpan Uptime { get; set; } = TimeSpan.Zero;
            public string AgentVersion { get; set; } = "1.0.0";
            public DateTime LastBootTime { get; set; } = DateTime.MinValue;
        }

        // 🔹 CPU
        public class CpuStats
        {
            public int Cores { get; set; }
            public int LogicalProcessors { get; set; }
            public int BaseClockMHz { get; set; }
            public int CurrentClockMHz { get; set; }
            public float UsagePercent { get; set; }
            public float TemperatureCelsius { get; set; }
        }

        // 🔹 Memory
        public class MemoryStats
        {
            public long TotalMb { get; set; }
            public long UsedMb { get; set; }
            public long FreeMb => TotalMb - UsedMb;
            public float UsagePercent => TotalMb > 0 ? (float)UsedMb / TotalMb * 100 : 0;
        }

        // 🔹 GPU
        public class GpuStats
        {
            public string Name { get; set; } = string.Empty;
            public long VRamMb { get; set; }
            public float UsagePercent { get; set; }
            public float TemperatureCelsius { get; set; }
            public int FanSpeedPercent { get; set; }
            public string DriverVersion { get; set; } = string.Empty;
        }

        // 🔹 Storage
        public class DiskStats
        {
            public string DriveLetter { get; set; } = string.Empty;
            public string DriveType { get; set; } = string.Empty; // SSD, HDD, Removable
            public long TotalMb { get; set; }
            public long UsedMb { get; set; }
            public long FreeMb => TotalMb - UsedMb;
            public float UsagePercent => TotalMb > 0 ? (float)UsedMb / TotalMb * 100 : 0;
            public double ReadSpeedMBps { get; set; }
            public double WriteSpeedMBps { get; set; }
        }

        // 🔹 Network
        public class NetworkStats
        {
            public string AdapterName { get; set; } = string.Empty;
            public string MacAddress { get; set; } = string.Empty;
            public string LocalIp { get; set; } = string.Empty;
            public string PublicIp { get; set; } = string.Empty;
            public string ConnectionType { get; set; } = string.Empty; // Ethernet/WiFi
            public double UploadMbps { get; set; }
            public double DownloadMbps { get; set; }
            public double PacketLossPercent { get; set; }
            public int SignalStrengthPercent { get; set; } // WiFi only
        }

        // 🔹 Power / Battery
        public class PowerStats
        {
            public bool IsCharging { get; set; }
            public int BatteryPercent { get; set; }
            public TimeSpan EstimatedRemaining { get; set; } = TimeSpan.Zero;
            public float CurrentPowerDrawWatts { get; set; }
        }

        // 🔹 Security / Health
        public class SecurityStats
        {
            public bool FirewallEnabled { get; set; }
            public bool AntivirusEnabled { get; set; }
            public bool SecureBootEnabled { get; set; }
            public int PendingUpdates { get; set; }
        }

        // 🔹 Processes
        public class ProcessStats
        {
            public string Name { get; set; } = string.Empty;
            public int Pid { get; set; }
            public float CpuPercent { get; set; }
            public long MemoryMb { get; set; }
        }

        // 🔹 Collections (so we can have multiple GPUs, NICs, Drives, etc.)
        public SystemStats System { get; set; } = new();
        public CpuStats Cpu { get; set; } = new();
        public MemoryStats Memory { get; set; } = new();
        public List<GpuStats> Gpus { get; set; } = new();
        public List<DiskStats> Disks { get; set; } = new();
        public List<NetworkStats> Networks { get; set; } = new();
        public PowerStats Power { get; set; } = new();
        public SecurityStats Security { get; set; } = new();
        public List<ProcessStats> TopProcesses { get; set; } = new();
    }
}
