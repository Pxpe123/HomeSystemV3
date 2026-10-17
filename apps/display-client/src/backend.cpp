#include "backend.h"
#include <iostream>
#include <QDebug>

#ifdef _WIN32
#include <windows.h>
#endif

void Backend::openConsole() {
#ifdef _WIN32
    if (!AllocConsole()) return;
    FILE* fp;
    freopen_s(&fp, "CONOUT$", "w", stdout);
    freopen_s(&fp, "CONOUT$", "w", stderr);
    std::cout << "Windows Console Allocated!" << std::endl;
#else
    // Linux: Already has console if run from terminal
    std::cout << "Console already available on Linux/Unix" << std::endl;
    qDebug() << "Running on Linux - console output goes to terminal";
#endif
}

void Backend::receiveData(const QString& data) {
    qDebug() << "Received from JavaScript:" << data;
    std::cout << "JS sent: " << data.toStdString() << std::endl;

    emit dataFromQt("Qt received: " + data);
}
