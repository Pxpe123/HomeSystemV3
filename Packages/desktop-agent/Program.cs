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

        Console.WriteLine("Hello World!");

        Thread worker = new Thread(() =>
        {
            while (true)
            {
                Console.WriteLine($"Worker tick: {DateTime.Now}");
                Thread.Sleep(5000);
            }
        });
        worker.IsBackground = true;
        worker.Start();

        var exitEvent = new ManualResetEvent(false);
        exitEvent.WaitOne();
    }
}