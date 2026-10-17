#include <QApplication>
#include <QWebEngineView>
#include <QWebChannel>
#include "backend.h"
#include <QWebEngineSettings>
#include <QCommandLineParser>
#include <QDebug>

int main(int argc, char* argv[])
{
    QApplication app(argc, argv);
    QCoreApplication::setApplicationName("HomeSystem Display");
    QCommandLineParser parser;
    parser.setApplicationDescription("HomeSystem touchscreen display");
    parser.addHelpOption();
    QCommandLineOption urlOption("url", "HomeSystem UI address (or set HOMESYSTEM_UI_URL)", "url",
        qEnvironmentVariable("HOMESYSTEM_UI_URL", "http://127.0.0.1:8088"));
    parser.addOption(urlOption);
    parser.process(app);
    const QUrl uiUrl(parser.value(urlOption));
    if (!uiUrl.isValid() || uiUrl.host().isEmpty() || (uiUrl.scheme() != "http" && uiUrl.scheme() != "https") || !uiUrl.userInfo().isEmpty()) {
        qCritical() << "Use an HTTP(S) HomeSystem URL without embedded credentials.";
        return 2;
    }

    QWebEngineView view;
    view.resize(800, 600);
    view.setWindowTitle("Cross-Platform Web UI");

    Backend backend;
    QWebChannel channel;
    channel.registerObject("backend", &backend);
    view.page()->setWebChannel(&channel);
    view.page()->settings()->setAttribute(QWebEngineSettings::LocalContentCanAccessFileUrls, true);
    view.page()->settings()->setAttribute(QWebEngineSettings::LocalContentCanAccessRemoteUrls, true);

    view.setUrl(uiUrl);

    // For Raspberry Pi, you might want to go fullscreen
    #ifdef __arm__  // ARM architecture (like Raspberry Pi)
        view.showFullScreen();
    #else
        view.show();
    #endif

    return app.exec();
}
