#pragma once
#include <QObject>
#include <QString>

class Backend : public QObject
{
    Q_OBJECT
public:
    explicit Backend(QObject* parent = nullptr) : QObject(parent) {}

public slots:
    void openConsole();
    void receiveData(const QString& data);

signals:
    void dataFromQt(const QString& message);
    void numberResult(int result);
};
