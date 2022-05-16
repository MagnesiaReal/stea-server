CREATE DATABASE SteaDB;

use SteaDB;
------- UPDATE DATABASE CONSTRUCTION
CREATE TABLE Avatar(idAvatar INT PRIMARY KEY NOT NULL AUTO_INCREMENT, nombre VARCHAR(16) NOT NULL, avatarUrl VARCHAR(256) NOT NULL, descripcion TEXT NOT NULL);

CREATE TABLE Usuario(idUsuario INT PRIMARY KEY NOT NULL AUTO_INCREMENT, nombre VARCHAR(128) NOT NULL, apellido VARCHAR(128)NOT NULL, email varchar(256) NOT NULL, nacimiento DATE NOT NULL, admin BOOLEAN DEFAULT 0, pass varchar(2048) NOT NULL, foto LONGBLOB NULL, configuracion JSON, idAvatar INT, CONSTRAINT FK_Usuario_Avatar FOREIGN KEY(idAvatar) REFERENCES Avatar(idAvatar), uuid VARCHAR(40) NOT NULL);

CREATE TABLE Grupo(idGrupo INT PRIMARY KEY NOT NULL AUTO_INCREMENT, nombre VARCHAR(128) NOT NULL, grupo VARCHAR(8), info TEXT);

CREATE TABLE UsuarioGrupo(idUsuarioGrupo INT PRIMARY KEY NOT NULL AUTO_INCREMENT, tipoUsuario TINYINT(2) NOT NULL, idUsuario INT, idGrupo INT, CONSTRAINT FK_UsuarioGrupo_Usuario FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario), CONSTRAINT FK_UsuarioGrupo_Grupo FOREIGN KEY(idGrupo) REFERENCES Grupo(idGrupo));

CREATE TABLE Habilidad(idHabilidad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, nombre VARCHAR(128) NOT NULL, extras JSON);

CREATE TABLE UsuarioGrupoHabildiad(idHabilidad INT, idUsuarioGrupo INT, CONSTRAINT FK_UsuarioGrupoHabilidad_UsuarioGrupo FOREIGN KEY(idUsuarioGrupo) REFERENCES UsuarioGrupo(idUsuarioGrupo), CONSTRAINT FK_UsuarioGrupoHabilidad_Habilidad FOREIGN KEY(idHabilidad) REFERENCES Habilidad(idHabilidad));

CREATE TABLE Actividad(idActividad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, titulo VARCHAR(128) NOT NULL, descripcion TEXT NOT NULL, actividad JSON);

CREATE TABLE UsuarioActividad(idUsuarioActividad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, tipoPermiso TINYINT(3) NOT NULL, idUsuario INT, idActividad INT, CONSTRAINT FK_UsuarioActividad_Usuario FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario), CONSTRAINT FK_UsuarioActividad_Actividad FOREIGN KEY(idActividad) REFERENCES Actividad(idActividad));

CREATE TABLE UsuarioGrupoActividad(idUsuarioGrupoActividad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, idUsuarioGrupo INT, idActividad INT, calificacion INT NOT NULL, resultados JSON, CONSTRAINT FK_UsuarioGrupoActividad_Actividad FOREIGN KEY(idActividad) REFERENCES Actividad(idActividad), CONSTRAINT FK_UsuarioGrupoActividad_UsuarioGrupo FOREIGN KEY(idUsuarioGrupo) REFERENCES UsuarioGrupo(idUsuarioGrupo));

CREATE TABLE GrupoActividadResultados(idGrupoActividadResultados INT PRIMARY KEY NOT NULL AUTO_INCREMENT, idGrupoActividad INT NOT NULL, idUsuario INT NOT NULL, calificacion INT, resultados JSON, CONSTRAINT FK_GrupoActividadResultados_GrupoActividad FOREIGN KEY(idGrupoActividad) REFERENCES GrupoActividad(idGrupoActividad), CONSTRAINT FK_GrupoActividadResultados_Usuario FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario));


CREATE TABLE GrupoActividad(idGrupoActividad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, idGrupo INT, idActividad INT, estadisticos JSON, CONSTRAINT FK_GrupoActividad_Actividad FOREIGN KEY(idActividad) REFERENCES Actividad(idActividad), CONSTRAINT FK_GrupoActividad_Grupo FOREIGN KEY(idGrupo) REFERENCES Grupo(idGrupo), fechaInicio DATE NOT NULL, fechaFin DATE NOT NULL, modo TINYINT(3) NOT NULL);

-- View for owner groups
CREATE VIEW PropietarioGrupo AS SELECT g.idGrupo, g.nombre as nombreGrupo, g.grupo, ug.idUsuario, concat(u.nombre, ' ',u.apellido) as nombreUsuario FROM UsuarioGrupo ug, Grupo g, Usuario u WHERE ug.idGrup
o=g.idGrupo AND u.idUsuario=ug.idUsuario AND ug.tipoUsuario=1;

-- View for now if user has permissions
CREATE VIEW AllUsuariosActividades AS SELECT ga.idGrupoActividad, ug.idUsuarioGrupo, ug.idUsuario, ug.idGrupo, a.idActividad, a.titulo, a.descripcion, ga.fechaInicio, ga.fechaFin FROM UsuarioGrupo ug JOIN GrupoActividad ga ON ug.idGrupo=ga.idGrupo JOIN Actividad a ON ga.idActividad=a.idActividad;
