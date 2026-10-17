FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /var/lib/homesystem && chown -R app:app /var/lib/homesystem
USER $APP_UID
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["CentralServer.csproj", "BuildMetadata.targets", "packages.lock.json", "./"]
RUN dotnet restore "CentralServer.csproj" --locked-mode
COPY . .
ENV HomeSystemDeploymentRoot=/app/deployments/
WORKDIR "/src/"
RUN dotnet build "CentralServer.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
ARG HOMESYSTEM_BUILD_VERSION
ARG HOMESYSTEM_BUILD_ID
ARG HOMESYSTEM_BUILD_COMMIT
ARG HOMESYSTEM_BUILD_TIME_UTC
RUN dotnet publish "CentralServer.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "CentralServer.dll"]
