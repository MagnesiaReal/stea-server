CREATE DATABASE SteaDB;

use SteaDB;
------- UPDATE DATABASE CONSTRUCTION
CREATE TABLE Avatar(idAvatar INT PRIMARY KEY NOT NULL AUTO_INCREMENT, nombre VARCHAR(16) NOT NULL, avatarUrl VARCHAR NOT NULL, descripcion TEXT NOT NULL);

CREATE TABLE Usuario(idUsuario INT PRIMARY KEY NOT NULL AUTO_INCREMENT, nombre VARCHAR(128) NOT NULL, apellido VARCHAR(128)NOT NULL, email varchar(256) NOT NULL, nacimiento DATE NOT NULL, admin BOOLEAN DEFAULT 0, pass varchar(2048) NOT NULL, foto LONGBLOB NULL, configuracion JSON, idAvatar INT, CONSTRAINT FK_Usuario_Avatar FOREIGN KEY(idAvatar) REFERENCES Avatar(idAvatar));

CREATE TABLE Sesion(uuid VARCHAR(40) NOT NULL PRIMARY KEY, idUsuario INT NOT NULL, CONSTRAINT FK_Sesion_Usuario FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario));

CREATE TABLE Grupo(idGrupo INT PRIMARY KEY NOT NULL AUTO_INCREMENT, nombre VARCHAR(128) NOT NULL, info TEXT, participantes INT DEFAULT 0);

CREATE TABLE UsuarioGrupo(idUsuarioGrupo INT PRIMARY KEY NOT NULL AUTO_INCREMENT, tipoUsuario TINYINT(2) NOT NULL, idUsuario INT, idGrupo INT, CONSTRAINT FK_UsuarioGrupo_Usuario FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario), CONSTRAINT FK_UsuarioGrupo_Grupo FOREIGN KEY(idGrupo) REFERENCES Grupo(idGrupo));

CREATE TABLE Habilidad(idHabilidad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, nombre VARCHAR(128) NOT NULL, extras JSON);

CREATE TABLE UsuarioGrupoHabildiad(idHabilidad INT, idUsuarioGrupo INT, CONSTRAINT FK_UsuarioGrupoHabilidad_UsuarioGrupo FOREIGN KEY(idUsuarioGrupo) REFERENCES UsuarioGrupo(idUsuarioGrupo), CONSTRAINT FK_UsuarioGrupoHabilidad_Habilidad FOREIGN KEY(idHabilidad) REFERENCES Habilidad(idHabilidad));

CREATE TABLE Actividad(idActividad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, titulo VARCHAR(128) NOT NULL, descripcion TEXT NOT NULL, actividad JSON NOT NULL);

CREATE TABLE UsuarioActividad(idUsuarioActividad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, esPropietario BOOLEAN, permisos TINYINT(3), idUsuario INT, idActividad INT, CONSTRAINT FK_UsuarioActividad_Usuario FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario), CONSTRAINT FK_UsuarioActividad_Actividad FOREIGN KEY(idActividad) REFERENCES Actividad(idActividad));

CREATE TABLE UsuarioGrupoActividad(idUsuarioGrupoActividad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, idUsuarioGrupo INT, idActividad INT, calificacion INT NOT NULL, resultados JSON, CONSTRAINT FK_UsuarioGrupoActividad_Actividad FOREIGN KEY(idActividad) REFERENCES Actividad(idActividad), CONSTRAINT FK_UsuarioGrupoActividad_UsuarioGrupo FOREIGN KEY(idUsuarioGrupo) REFERENCES UsuarioGrupo(idUsuarioGrupo));

CREATE TABLE GrupoActividad(idGrupoActividad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, idGrupo INT, idActividad INT, estadisticos JSON, CONSTRAINT FK_GrupoActividad_Actividad FOREIGN KEY(idActividad) REFERENCES Actividad(idActividad), CONSTRAINT FK_GrupoActividad_Grupo FOREIGN KEY(idGrupo) REFERENCES Grupo(idGrupo));
