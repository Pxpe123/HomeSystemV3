cmake_minimum_required(VERSION 3.16)
project(HomeSystemV3 LANGUAGES CXX)
include(GNUInstallDirs)

get_filename_component(HOMESYSTEM_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../.." ABSOLUTE)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${HOMESYSTEM_ROOT}/.local/build/display-client/bin")
if(CMAKE_INSTALL_PREFIX_INITIALIZED_TO_DEFAULT)
    set(CMAKE_INSTALL_PREFIX "${HOMESYSTEM_ROOT}/Deployments/display-client" CACHE PATH "Display deployment location" FORCE)
endif()

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

if(ANDROID)
    find_package(Qt6 6.10 REQUIRED COMPONENTS Core Gui Quick QuickControls2 WebView)
    qt_standard_project_setup(REQUIRES 6.10)
    qt_add_executable(HomeSystemV3 src/main_android.cpp src/DisplaySettings.h)
    qt_add_qml_module(HomeSystemV3 URI HomeSystemV3 VERSION 1.0 QML_FILES qml/Main.qml)
    target_link_libraries(HomeSystemV3 PRIVATE Qt6::Quick Qt6::QuickControls2 Qt6::WebView)
    set_target_properties(HomeSystemV3 PROPERTIES
        QT_ANDROID_PACKAGE_SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/android"
        QT_ANDROID_PACKAGE_NAME "uk.homesystem.display"
        QT_ANDROID_APP_NAME "HomeSystem"
        QT_ANDROID_VERSION_CODE 1
        QT_ANDROID_VERSION_NAME "0.1.0"
        QT_ANDROID_MIN_SDK_VERSION 28
        QT_ANDROID_TARGET_SDK_VERSION 36
    )
    return()
endif()

find_package(Qt6 REQUIRED COMPONENTS Core Gui WebEngineWidgets WebChannel)

# Create the resource file properly
qt_add_resources(RESOURCES
    web/data.qrc
)

qt_add_executable(HomeSystemV3
    src/main.cpp
    src/backend.h
    src/backend.cpp
    ${RESOURCES}
)

set_target_properties(HomeSystemV3 PROPERTIES
    WIN32_EXECUTABLE TRUE
    MACOSX_BUNDLE TRUE
)

target_link_libraries(HomeSystemV3 PUBLIC
    Qt::Core
    Qt::Gui
    Qt::WebEngineWidgets
    Qt::WebChannel
)

install(TARGETS HomeSystemV3
    RUNTIME DESTINATION "${CMAKE_INSTALL_BINDIR}"
    BUNDLE DESTINATION .
    LIBRARY DESTINATION "${CMAKE_INSTALL_LIBDIR}"
)
