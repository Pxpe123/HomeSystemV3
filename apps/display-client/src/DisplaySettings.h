#pragma once
#include <QObject>
#include <QSettings>
#include <QUrl>

// Native wrapper configuration; app/profile state remains owned by the WebUI.
class DisplaySettings final : public QObject {
    Q_OBJECT
    Q_PROPERTY(QUrl uiUrl READ uiUrl NOTIFY uiUrlChanged)
  public:
    explicit DisplaySettings(QObject *parent = nullptr) : QObject(parent) {}
    QUrl uiUrl() const { return QUrl(m_settings.value("display/uiUrl").toString()); }
    Q_INVOKABLE bool connectTo(const QString &address) {
        const QUrl url(address.trimmed());
        if (!url.isValid() || url.host().isEmpty() || !url.userInfo().isEmpty() ||
            !url.query().isEmpty() || !url.fragment().isEmpty() ||
            (url.scheme() != "https" && url.scheme() != "http"))
            return false;
        m_settings.setValue("display/uiUrl", url.toString());
        m_settings.sync();
        if (m_settings.status() != QSettings::NoError)
            return false;
        emit uiUrlChanged();
        return true;
    }
  signals:
    void uiUrlChanged();

  private:
    QSettings m_settings;
};
