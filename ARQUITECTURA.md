# Documento de Arquitectura - DBStats

## 1. Resumen ejecutivo

DBStats es una aplicacion web SPA orientada a visualizacion y exploracion de datos deportivos. La solucion se ejecuta completamente en cliente (browser), consulta datos en Supabase (PostgreSQL + API PostgREST) y se despliega como sitio estatico en GitHub Pages.

El objetivo arquitectonico principal es simplicidad operativa: cero backend propio, time-to-market rapido y mantenimiento bajo en infraestructura.

---

## 2. Alcance funcional

- Exploracion de competiciones por temporada, categoria y fase.
- Vistas de estadisticas globales y por equipo/jugador.
- Persistencia de estado de usuario en navegador (favoritos, seleccion reciente, contexto de vista).
- Modo de gestion local (admin mode) habilitado por gesto secreto en UI.

---

## 3. Vista de alto nivel

## 3.1 Componentes logicos

1. Frontend SPA
- Tecnologia: React + TypeScript + Vite.
- Responsabilidad: UI, navegacion, orquestacion de estado y consumo de datos.

2. Capa de acceso a datos
- Tecnologia: @supabase/supabase-js.
- Responsabilidad: ejecutar consultas tipadas hacia tablas y relaciones de Supabase.

3. Persistencia remota
- Tecnologia: Supabase (PostgreSQL + PostgREST).
- Responsabilidad: almacenamiento transaccional de competiciones, equipos, plantillas, partidos y estadisticas.

4. Persistencia local de sesion/usuario
- Tecnologia: localStorage y sessionStorage.
- Responsabilidad: preferencias locales y cache de contexto para mejorar UX.

5. Hosting y entrega
- Tecnologia: GitHub Pages + build estatico de Vite.
- Responsabilidad: publicacion del bundle frontend sin runtime server-side propio.

## 3.2 Flujo principal

1. El usuario carga la SPA desde GitHub Pages.
2. La app inicializa filtros y estado local.
3. La capa de servicio consulta Supabase segun filtros activos.
4. La UI renderiza vistas de clasificacion, scouting y analitica.
5. Selecciones y favoritos se guardan en storage del navegador.

---

## 4. Stack tecnologico

## 4.1 Frontend

- React 19
- React Router DOM (HashRouter para compatibilidad con hosting estatico)
- TypeScript 5
- Vite 6
- Recharts para graficas
- Lucide React para iconografia
- Tailwind CSS via CDN en index.html (sin pipeline local de Tailwind)

## 4.2 Datos y conectividad

- @supabase/supabase-js (cliente JS para PostgREST/Auth/Storage de Supabase)
- Base de datos relacional en Supabase (PostgreSQL)

## 4.3 Build y despliegue

- npm scripts (dev, build, lint, preview)
- gh-pages para publicar carpeta dist

---

## 5. Decisiones arquitectonicas importantes

## 5.1 Modo de iteracion y entrega

Decision:
- Iteracion incremental en frontend, orientada a feature delivery rapida.
- Publicacion como artefacto estatico en GitHub Pages.

Rationale:
- Reduce complejidad operativa y coste de infraestructura.
- Facilita ciclos cortos de prueba/entrega.

Trade-offs:
- No existe backend propio para encapsular reglas sensibles.
- Dependencia directa de politicas RLS y estructura de Supabase.

## 5.2 Patron de arquitectura en cliente

Decision:
- Estructura por capas ligera:
  - componentes de presentacion en components
  - servicios de acceso a datos en services/dataService.ts
  - utilidades de estado persistido en utils

Rationale:
- Mantiene separacion basica de responsabilidades sin introducir frameworks de estado complejos.

Trade-offs:
- A medida que crezca la app, puede aparecer acoplamiento entre vistas y servicios.

## 5.3 Persistencia local

Decision:
- localStorage para preferencias semipersistentes:
  - competicion activa y recientes
  - favoritos de jugadores y equipos
  - flag de modo gestion
- sessionStorage para estado de trabajo temporal por competicion:
  - equipo seleccionado
  - detalles de equipo en vista de estadisticas

Rationale:
- Mejora UX percibida y reduce recarga de contexto por navegacion.

Trade-offs:
- Estado no compartible entre dispositivos.
- Riesgo de incoherencia si cambia el modelo remoto.

## 5.4 Seguridad y control de acceso

Decision actual:
- Cliente usa URL y clave anon de Supabase directamente en frontend.
- No hay autenticacion de usuario final en el flujo principal.
- El modo gestion de UI es local y no constituye control de acceso real.

Implicacion:
- La seguridad real debe residir en RLS de Supabase y permisos de esquema.

Trade-offs:
- Simplicidad alta, pero superficie de exposicion mayor si RLS no esta bien definida.

## 5.5 Conexion con aplicaciones externas

Decision:
- Integracion principal con Supabase como servicio externo de datos.
- Dependencias externas via CDN detectadas en index.html (Tailwind e importmap).

Rationale:
- Rapidez de arranque y menor friccion inicial.

Trade-offs:
- Mayor dependencia de disponibilidad de terceros en runtime.
- Posible drift de versiones entre package.json e importmap/CDN.

---

## 6. Modelo de datos y convenciones de consulta

Observaciones de convencion ya establecidas en el repositorio:

- En relaciones ambiguas de Supabase/PostgREST, usar embed explicito con constraint FK.
- Normalizar texto (NFD + sin diacriticos + lower) para filtros robustos por nombre.
- En agregados globales, incluir jugadores aunque no tengan estadisticas para evitar sesgo visual.

Estas practicas son correctas para robustez funcional y deben mantenerse como estandar.

---

## 7. Seguridad: estado actual y recomendaciones

## 7.1 Estado actual

- Credenciales anon de Supabase embebidas en codigo cliente.
- No se observa capa de backend intermediaria.
- Error boundary presente para resiliencia de UI.

## 7.2 Recomendaciones prioritarias

1. Mover URL/anon key a variables de entorno de Vite (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
2. Revisar y endurecer RLS en todas las tablas consumidas por el frontend.
3. Definir CSP y cabeceras de seguridad en hosting (si el proveedor lo permite).
4. Evitar confiar en admin mode cliente para operaciones sensibles.
5. Revisar dependencias CDN y preferir dependencias empaquetadas para minimizar riesgo de supply chain runtime.

---

## 8. Calidad, operacion y observabilidad

Estado actual:
- Linting de tipos con tsc --noEmit.
- Sin suite de tests automatizados visible.
- Sin telemetria/observabilidad explicita.

Recomendaciones:

1. Incorporar pruebas unitarias para logica critica en services y utils.
2. Agregar pruebas de smoke E2E para flujos principales (filtros, carga de competicion, stats equipo).
3. Introducir monitoreo de errores de frontend (ej. Sentry o similar).

---

## 9. Riesgos arquitectonicos detectados

1. Riesgo de configuracion inconsistente de ruta base en despliegue estatico.
- package.json indica homepage con DBStats y vite.config.ts tiene base /Stats/.

2. Riesgo de incoherencia de dependencias.
- El proyecto usa package.json, pero index.html contiene importmap/CDN con versiones diferentes.

3. Riesgo de seguridad por secretos/config en cliente.
- Aunque anon key no es un secreto critico, su uso directo exige RLS estricta y auditoria continua.

---

## 10. Roadmap arquitectonico sugerido

Fase 1 (corto plazo)

1. Consolidar estrategia de dependencias: bundler-only o CDN-only (recomendado bundler-only).
2. Unificar base path de Vite con homepage real de despliegue.
3. Externalizar configuracion Supabase a variables de entorno.

Fase 2 (medio plazo)

1. Endurecer seguridad con revision formal de RLS y politicas por tabla.
2. Introducir tests unitarios/E2E minimos.
3. Incorporar trazabilidad de errores en frontend.

Fase 3 (si escala funcionalmente)

1. Evaluar BFF ligero para casos de negocio sensible o agregaciones costosas.
2. Evaluar cache semantica y/o materializacion de vistas en BD para consultas globales pesadas.

---

## 11. Conclusiones

La arquitectura actual prioriza simplicidad y velocidad de entrega, alineada con un producto analitico centrado en lectura de datos. El diseno es valido para el estado actual, con foco de mejora en seguridad operativa (RLS + configuracion), coherencia de build/deploy y calidad automatizada.