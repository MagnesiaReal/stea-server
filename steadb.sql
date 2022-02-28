use steadb;

-- this is a catalogue
CREATE TABLE Avatar(idAvatar INT PRIMARY KEY NOT NULL AUTO_INCREMENT, rol VARCHAR(128) NOT NULL, avatar LONGBLOB NOT NULL);


CREATE TABLE UsuarioConfiguracion(idUsuarioConfiguracion INT PRIMARY KEY NOT NULL, foto LONGBLOB, configuracion JSON, idUsuario INT NOT NULL, idAvatar INT NOT NULL);

CREATE TABLE Usuario(idUsuario INT PRIMARY KEY NOT NULL, nombre VARCHAR(128) NOT NULL, apellido VARCHAR(128) NOT NULL, email VARCHAR(128) NOT NULL, nacimiento DATE NOT NULL, admin BOOL NOT NULL);

ALTER TABLE UsuarioConfiguracion ADD CONSTRAINT FK_UsuarioConfiguracion_Usuario FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario);

ALTER TABLE UsuarioConfiguracion ADD CONSTRAINT FK_UsuarioConfiguracion_Avatar FOREIGN KEY(idAvatar) REFERENCES Avatar(idAvatar);


CREATE TABLE Grupo(idGrupo INT PRIMARY KEY NOT NULL, idUsuario INT NOT NULL, info JSON, participantes INT NOT NULL, CONSTRAINT FK_Grupo_Usuario FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario), extras JSON);



CREATE TABLE UsuarioHabilidades(idUsuarioHabilidad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, idUsuario INT NOT NULL, idGrupo INT NOT NULL, idHabilidad INT NOT NULL, cantidad INT NOT NULL, CONSTRAINT FK_UsuarioHabilidades_Usuario FOREIGN KEY(idUsuario) REFERENCES Usuario(idUsuario), CONSTRAINT FK_UsuarioHabilidades_Grupo FOREIGN KEY(IdGrupo) REFERENCES Grupo(idGrupo));


CREATE TABLE Habilidad(idHabilidad INT PRIMARY KEY NOT NULL AUTO_INCREMENT, nombre VARCHAR(128) NOT NULL, extras JSON);

ALTER TABLE UsuarioHabilidades ADD CONSTRAINT FK_UsuarioHabilidades_Habilidad FOREIGN KEY(idHabilidad) REFERENCES Habilidad(idHabilidad);

ALTER TABLE Usuario ADD Password VARCHAR(1024) NOT NULL;

