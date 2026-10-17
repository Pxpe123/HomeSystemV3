using System;
using System.Runtime.InteropServices;
using System.Threading;

class Program
{
    [DllImport("kernel32.dll")]
    static extern bool AllocConsole();

    static void Main()
    {
#if DEBUG
        AllocConsole();
        Console.WriteLine("Debug console active. Close this window or press Ctrl+C to exit.");
#endif

        Console.WriteLine("HomeSystem desktop agent scaffold. ControlServer transport is not configured.");
        using var exitEvent = new ManualResetEventSlim(false);
        Console.CancelKeyPress += (_, args) => { args.Cancel = true; exitEvent.Set(); };
        exitEvent.Wait();
    }
}
