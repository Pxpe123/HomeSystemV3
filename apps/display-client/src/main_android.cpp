
#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QCoreApplication>
#include <QDebug>

#include <QtWebView/QtWebView>
#include "DisplaySettings.h"

int main(int argc, char *argv[])
{
    QtWebView::initialize();
    QGuiApplication app(argc, argv);

    app.setApplicationName("HomeSystemV3");
    app.setOrganizationName("HomeSystem");

    DisplaySettings settings;
    QQmlApplicationEngine engine;

    engine.rootContext()->setContextProperty(
        "displaySettings", &settings
        );

    QObject::connect(
        &engine,
        &QQmlApplicationEngine::objectCreationFailed,
        &app,
        []() {
            QCoreApplication::exit(EXIT_FAILURE);
        },
        Qt::QueuedConnection
        );

    engine.loadFromModule("HomeSystemV3", "Main");

    if (engine.rootObjects().isEmpty()) {
        qCritical() << "Failed to load Main.qml";
        return EXIT_FAILURE;
    }

    return app.exec();
}
