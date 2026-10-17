import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtWebView

ApplicationWindow {
    id: window
    visible: true
    visibility: Window.FullScreen
    title: "HomeSystem"
    color: "#101c30"
    property bool configuring: displaySettings.uiUrl.toString() === ""
    property bool loadFailed: false

    WebView {
        id: browser
        anchors.fill: parent
        visible: !window.configuring && !window.loadFailed
        url: displaySettings.uiUrl
        onLoadingChanged: function(request) {
            if (request.status === WebView.LoadFailedStatus) window.loadFailed = true
        }
    }
    ColumnLayout {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 480)
        spacing: 16
        visible: window.configuring || window.loadFailed
        Label { text: "HomeSystem"; color: "#89dbd0"; font.pixelSize: 32 }
        Label { text: window.loadFailed ? "Your home display could not be reached." : "Connect this display to your home."; color: "white"; wrapMode: Text.WordWrap; Layout.fillWidth: true }
        Label { text: "Enter the WebUI address. Use the server’s Wi-Fi address, not localhost. Press Android Back to change it later."; color: "#bbc8d6"; wrapMode: Text.WordWrap; Layout.fillWidth: true }
        TextField {
            id: address
            Layout.fillWidth: true
            placeholderText: "http://192.168.1.10:8088"
            text: displaySettings.uiUrl.toString()
            inputMethodHints: Qt.ImhUrlCharactersOnly | Qt.ImhNoAutoUppercase
            Accessible.name: "Home display address"
            onAccepted: connectButton.clicked()
        }
        Label { id: error; Layout.fillWidth: true; color: "#ff6b9d"; wrapMode: Text.WordWrap }
        Button {
            id: connectButton
            text: "Open home display"
            Layout.fillWidth: true
            onClicked: {
                if (!displaySettings.connectTo(address.text)) {
                    error.text = "Enter a valid HTTP or HTTPS address without credentials, queries or fragments."
                    address.forceActiveFocus()
                    return
                }
                error.text = ""
                window.loadFailed = false
                window.configuring = false
                browser.reload()
            }
        }
    }
    Item {
        focus: true
        Keys.onBackPressed: function(event) { window.configuring = true; event.accepted = true }
    }
}
