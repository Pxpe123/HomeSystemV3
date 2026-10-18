#ifndef PackageRoot
  #error PackageRoot must point to the packaged Windows client
#endif
#ifndef PackageVersion
  #define PackageVersion "0.0.0"
#endif

[Setup]
AppId={{9A02F216-ED11-4C5E-BD95-9950E4AA0422}
AppName=HomeSystem Display
AppVersion={#PackageVersion}
AppPublisher=HomeSystem
DefaultDirName={localappdata}\Programs\HomeSystem Display
DefaultGroupName=HomeSystem
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#PackageRoot}
OutputBaseFilename=HomeSystem-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\bin\HomeSystemV3.exe
CloseApplications=yes

[Files]
Source: "{#PackageRoot}\bin\*"; DestDir: "{app}\bin"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\HomeSystem Display"; Filename: "{app}\bin\HomeSystemV3.exe"; WorkingDir: "{app}\bin"

[Run]
Filename: "{app}\bin\HomeSystemV3.exe"; Description: "Open HomeSystem Display"; Flags: nowait postinstall skipifsilent
