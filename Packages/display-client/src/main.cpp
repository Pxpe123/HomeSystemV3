#include <QApplication>
#include <QWebEngineView>
#include <QWebChannel>
#include "backend.h"
#include <QWebEngineSettings>

int main(int argc, char* argv[])
{
    QApplication app(argc, argv);

    QWebEngineView view;
    view.resize(800, 600);
    view.setWindowTitle("Cross-Platform Web UI");

    Backend backend;
    QWebChannel channel;
    channel.registerObject("backend", &backend);
    view.page()->setWebChannel(&channel);
    view.page()->settings()->setAttribute(QWebEngineSettings::LocalContentCanAccessFileUrls, true);
    view.page()->settings()->setAttribute(QWebEngineSettings::LocalContentCanAccessRemoteUrls, true);

    view.setUrl(QUrl("qrc:/index.html"));

    // For Raspberry Pi, you might want to go fullscreen
    #ifdef __arm__  // ARM architecture (like Raspberry Pi)
        view.showFullScreen();
    #else
        view.show();
    #endif

    return app.exec();
}
