cmake_minimum_required(VERSION 3.16)
project(HomeSystemV3 LANGUAGES CXX)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

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
