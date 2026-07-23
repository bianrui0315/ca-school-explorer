/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "en" | "es";

const STORAGE_KEY = "ca-school-explorer.locale.v1";

const spanish: Record<string, string> = {
  "A–G completion": "Finalización A–G",
  "A–G completion rate": "Tasa de finalización A–G",
  Action: "Acción",
  Add: "Agregar",
  "Add a school first": "Primero agrega una escuela",
  "Add a school to compare": "Agrega una escuela para comparar",
  "Add a school to find similar context peers.":
    "Agrega una escuela para encontrar pares de contexto similar.",
  "Add school": "Agregar escuela",
  Added: "Agregada",
  "All indicators comparison": "Comparación de todos los indicadores",
  "All public schools": "Todas las escuelas públicas",
  "Area Explorer": "Explorar zona",
  "Area Explorer · California School Explorer":
    "Explorar zona · California School Explorer",
  "All students": "Todos los estudiantes",
  "Anchor school": "Escuela de referencia",
  Attendance: "Asistencia",
  "Average class size": "Tamaño promedio de clase",
  "Average teacher experience": "Experiencia docente promedio",
  Back: "Atrás",
  "Build a Family Decision Brief": "Crear un informe de decisión familiar",
  "Built {date}": "Generado el {date}",
  "Buy me a coffee": "Invítame un café",
  California: "California",
  "California School Explorer home": "Inicio de California School Explorer",
  Charter: "Chárter",
  Clear: "Borrar",
  "Clear all": "Borrar todo",
  College: "Universidad",
  "College/career": "Universidad/carrera",
  "College/career prepared": "Preparación universitaria/profesional",
  "College/career prepared rate":
    "Tasa de preparación universitaria/profesional",
  "College-going": "Ingreso a la universidad",
  Compare: "Comparar",
  "Compare schools across time and context":
    "Compara escuelas a través del tiempo y el contexto",
  "Compare California schools across time, student groups, and transparent context baselines.":
    "Compara escuelas de California a través del tiempo, grupos de estudiantes y referencias de contexto transparentes.",
  "County · {name}": "Condado · {name}",
  "Countywide context": "Contexto del condado",
  "Compare selected": "Comparar seleccionadas",
  "Comparison controls": "Controles de comparación",
  "Comparison metrics": "Indicadores de comparación",
  "Context matching": "Comparación por contexto",
  "Copy profile link": "Copiar enlace del perfil",
  "Copy share link": "Copiar enlace para compartir",
  County: "Condado",
  "Data completeness": "Integridad de los datos",
  "Data freshness": "Actualización de datos",
  "Data release {release} · Generated {date}":
    "Versión de datos {release} · Generados el {date}",
  "Decision Brief": "Informe de decisión",
  "District · {name}": "Distrito · {name}",
  District: "Distrito",
  "District / city": "Distrito / ciudad",
  "District-operated": "Administrada por el distrito",
  Distance: "Distancia",
  Dropout: "Deserción",
  "Dropout rate": "Tasa de deserción",
  ELA: "Lengua y literatura inglesa",
  "ELA distance": "Distancia en lengua y literatura inglesa",
  Elementary: "Primaria",
  Enrollment: "Matrícula",
  English: "Inglés",
  "English learner student share":
    "Proporción de estudiantes aprendices de inglés",
  "English learners": "Aprendices de inglés",
  "Evidence coverage": "Cobertura de evidencia",
  "Evidence score (not a rank)":
    "Puntuación de evidencia (no es una clasificación)",
  "Experimental composite": "Índice compuesto experimental",
  Filters: "Filtros",
  "Find another school": "Buscar otra escuela",
  "Find schools near a new place": "Encuentra escuelas cerca de un lugar nuevo",
  "Find schools with a similar public profile":
    "Encuentra escuelas con un perfil público similar",
  "Family Decision Brief · California School Explorer":
    "Informe de decisión familiar · California School Explorer",
  "Four-year dropout rate": "Tasa de deserción de cuatro años",
  "Four-year graduation rate": "Tasa de graduación de cuatro años",
  Graduation: "Graduación",
  "Graduation rate": "Tasa de graduación",
  "Grade overlap": "Coincidencia de grados",
  "Grades / type": "Grados / tipo",
  "Higher is better": "Un valor mayor es mejor",
  High: "Secundaria",
  "How to read this": "Cómo interpretar esto",
  "Indicator weights": "Pesos de los indicadores",
  Kindergarten: "Kínder",
  Language: "Idioma",
  "Latest evidence": "Evidencia más reciente",
  "Latest outcome context": "Contexto de resultados más reciente",
  "Latest year": "Año más reciente",
  "Limit reached": "Límite alcanzado",
  "Loading map…": "Cargando mapa…",
  "Loading California school data": "Cargando datos escolares de California",
  "Loading school profile": "Cargando el perfil escolar",
  "Location and district": "Ubicación y distrito",
  "Location context": "Contexto geográfico",
  Mathematics: "Matemáticas",
  "Math distance": "Distancia en matemáticas",
  Methodology: "Metodología",
  Metrics: "Indicadores",
  Middle: "Intermedia",
  "Mobile project links": "Enlaces del proyecto para móvil",
  Nearby: "Cercanas",
  "Nearby does not mean assigned.":
    "Estar cerca no significa que la escuela esté asignada.",
  "No compatible peer set is available for this profile.":
    "No hay un grupo de pares compatible para este perfil.",
  "Not an official rating": "No es una calificación oficial",
  "Not available": "No disponible",
  "Not reported": "No reportado",
  "Official public data": "Datos públicos oficiales",
  "Official public data · Informational use only · No school ranking":
    "Datos públicos oficiales · Solo para fines informativos · Sin clasificación escolar",
  "Open Buy Me a Coffee": "Abrir Buy Me a Coffee",
  "Open full comparison": "Abrir comparación completa",
  "Open full teaching comparison": "Abrir comparación docente completa",
  "Open navigation": "Abrir navegación",
  Outcomes: "Resultados",
  "Outcomes are excluded from matching.":
    "Los resultados no se usan para buscar pares.",
  Overview: "Resumen",
  "Peer baseline active": "Referencia de pares activa",
  "Preparing peer baseline…": "Preparando la referencia de pares…",
  "Preparing the decision brief": "Preparando el informe de decisión",
  "Preparing the statewide school index and official indicators.":
    "Preparando el índice estatal de escuelas y los indicadores oficiales.",
  "Preparing official outcomes, context, and teaching resources.":
    "Preparando resultados oficiales, contexto y recursos docentes.",
  Print: "Imprimir",
  "Print brief": "Imprimir informe",
  Profile: "Perfil",
  "Primary navigation": "Navegación principal",
  "Project links": "Enlaces del proyecto",
  "Published measures for {year}": "Medidas publicadas para {year}",
  "QR code": "Código QR",
  "QR code for buymeacoffee.com/bianrui0315":
    "Código QR para buymeacoffee.com/bianrui0315",
  "Reference context": "Contexto de referencia",
  "Same county": "Mismo condado",
  "Same district": "Mismo distrito",
  "Same-district context": "Contexto del mismo distrito",
  "Reported teachers": "Docentes reportados",
  "Reset defaults": "Restablecer valores",
  "School context": "Contexto escolar",
  "School level": "Nivel escolar",
  "School location": "Ubicación de la escuela",
  "School overview": "Resumen de la escuela",
  "Scan the code or open the secure support page.":
    "Escanea el código o abre la página segura de apoyo.",
  "School profile sections": "Secciones del perfil escolar",
  "Search center": "Centro de búsqueda",
  "Search schools by name, district, address, or ZIP":
    "Buscar escuelas por nombre, distrito, dirección o código postal",
  "Selected schools": "Escuelas seleccionadas",
  "Selected schools on map": "Escuelas seleccionadas en el mapa",
  "Share view": "Compartir vista",
  "Share link copied": "Enlace copiado",
  "Share link ready in the address bar":
    "El enlace está listo en la barra de direcciones",
  "Similar context": "Contexto similar",
  "Similar-context reference": "Referencia de contexto similar",
  "Similar peers": "Pares similares",
  "Similar peers · {count} schools": "Pares similares · {count} escuelas",
  "Similar context anchor school": "Escuela de referencia de contexto similar",
  "Similar context peers": "Pares de contexto similar",
  Sources: "Fuentes",
  "Sources & notes": "Fuentes y notas",
  "Sources and limitations": "Fuentes y limitaciones",
  Spanish: "Español",
  "Student groups": "Grupos de estudiantes",
  "Student lens": "Grupo de estudiantes",
  "Students per reported teacher": "Estudiantes por docente reportado",
  "Students with disabilities": "Estudiantes con discapacidades",
  "Students with disabilities share":
    "Proporción de estudiantes con discapacidades",
  "Socioeconomically disadvantaged": "En desventaja socioeconómica",
  "Socioeconomically disadvantaged share":
    "Proporción de estudiantes en desventaja socioeconómica",
  Support: "Apoyar",
  "Support California School Explorer": "Apoya California School Explorer",
  "Support the project": "Apoya el proyecto",
  "Support this independent open-source project":
    "Apoya este proyecto independiente de código abierto",
  Suspension: "Suspensión",
  "Suspension rate": "Tasa de suspensión",
  Teaching: "Docencia",
  "Teaching & resources": "Docencia y recursos",
  "Teaching & resources · California School Explorer":
    "Docencia y recursos · California School Explorer",
  "Three schools to review": "Tres escuelas para revisar",
  "Three-year direction": "Tendencia de tres años",
  "Total reported staff": "Personal total reportado",
  "Try a sample Decision Brief": "Probar un informe de ejemplo",
  "Try again": "Intentar de nuevo",
  "Public data could not be loaded": "No se pudieron cargar los datos públicos",
  "Loading the selected schools and their official evidence.":
    "Cargando las escuelas seleccionadas y su evidencia oficial.",
  "See subgroup outcomes, school context, and the limits behind every number.":
    "Consulta resultados por grupo, contexto escolar y las limitaciones de cada cifra.",
  "Open source on GitHub": "Código abierto en GitHub",
  "Statewide context": "Contexto estatal",
  "{name} County": "Condado de {name}",
  "the anchor school": "la escuela de referencia",
  "Available when all selected schools belong to the same district.":
    "Disponible cuando todas las escuelas seleccionadas pertenecen al mismo distrito.",
  "Available when all selected schools belong to the same county.":
    "Disponible cuando todas las escuelas seleccionadas pertenecen al mismo condado.",
  "California provides a consistent statewide context across selections.":
    "California ofrece un contexto estatal uniforme para todas las selecciones.",
  "Built from {count} public schools matched to {school} using institutional profile data. Outcomes are excluded from matching.":
    "Creada con {count} escuelas públicas comparables a {school} según datos de perfil institucional. Los resultados no se usan para la coincidencia.",
  "Explore official outcomes, student-group context, teaching resources, and location details for {school}.":
    "Explora resultados oficiales, contexto de grupos estudiantiles, recursos docentes y ubicación de {school}.",
  "Turn a California location search into a shareable, explainable school shortlist using official public data.":
    "Convierte una búsqueda de ubicación en California en una lista breve de escuelas explicable y compartible con datos públicos oficiales.",
  "Use the search field to select up to five schools.":
    "Usa el campo de búsqueda para seleccionar hasta cinco escuelas.",
  "{start} to {end}": "{start} a {end}",
  "{current}/{total} current": "{current}/{total} actuales",
  "{older} older-only · {unavailable} unavailable":
    "{older} solo anteriores · {unavailable} no disponibles",
  "Older-only means a prior public value exists. Missing and suppressed results remain unavailable.":
    "Solo anteriores significa que existe un valor público previo. Los resultados faltantes y suprimidos siguen sin estar disponibles.",
  "View school profile": "Ver perfil escolar",
  "View source details": "Ver detalles de las fuentes",
  "What makes a match": "Qué define una coincidencia",
  "What stands out": "Aspectos destacados",
  "Why this is a context match": "Por qué coincide el contexto",
  "Work address or place": "Dirección de trabajo o lugar",
  "Year range": "Rango de años",
  "All cities": "Todas las ciudades",
  "All counties": "Todos los condados",
  "All grades": "Todos los grados",
  Center: "Centro",
  City: "Ciudad",
  "City filter": "Filtro de ciudad",
  "County filter": "Filtro de condado",
  Grade: "Grado",
  "Grade filter": "Filtro de grado",
  List: "Lista",
  Map: "Mapa",
  "Nearby center school": "Escuela central para búsqueda cercana",
  "Nearby radius": "Radio de búsqueda cercana",
  "Nearby does not mean assigned or eligible.":
    "Estar cerca no significa estar asignada ni ser elegible.",
  "No matching schools": "No hay escuelas coincidentes",
  "No schools within {radius} mi": "No hay escuelas en un radio de {radius} mi",
  Radius: "Radio",
  Reset: "Restablecer",
  "Remove {school}": "Quitar {school}",
  "School, district, address, or ZIP":
    "Escuela, distrito, dirección o código postal",
  "Search for a school to begin a comparison.":
    "Busca una escuela para comenzar una comparación.",
  "Selected schools ({count} of 5)": "Escuelas seleccionadas ({count} de 5)",
  "{count} matching schools": "{count} escuelas coincidentes",
  "{count} matching school": "{count} escuela coincidente",
  "{count} school within {radius} mi":
    "{count} escuela en un radio de {radius} mi",
  "{count} schools within {radius} mi":
    "{count} escuelas en un radio de {radius} mi",
  "{distance} mi from {school}": "A {distance} mi de {school}",
  "Showing the first {count} results. Add a ZIP or filter to narrow.":
    "Se muestran los primeros {count} resultados. Agrega un código postal o filtro para precisar.",
  "Showing the first {count} map results. Narrow the search for more detail.":
    "Se muestran los primeros {count} resultados del mapa. Precisa la búsqueda para obtener más detalle.",
  "Distances are straight-line estimates from published school coordinates. Verify boundaries with the district.":
    "Las distancias son estimaciones en línea recta desde coordenadas escolares publicadas. Verifica los límites con el distrito.",
  "At least three indicators are needed for the radar view.":
    "Se necesitan al menos tres indicadores para el gráfico radial.",
  "{count} indicators normalized to a zero to one hundred comparison scale. Missing indicators are not plotted.":
    "{count} indicadores normalizados en una escala comparativa de cero a cien. Los indicadores faltantes no se muestran.",
  "Map loads when this section is visible.":
    "El mapa se carga cuando esta sección es visible.",
  "Latest year · {year}": "Año más reciente · {year}",
  "A common 0–100 comparison scale makes indicators easier to scan. It is not a percentile or CDE rating.":
    "Una escala común de 0 a 100 facilita revisar los indicadores. No es un percentil ni una calificación del CDE.",
  "{count}-indicator profile": "Perfil de {count} indicadores",
  "Rates keep their natural 0–100 scale; lower-is-better rates are reversed. Academic distance maps −150 to 0, standard to 50, and +150 to 100. Missing values are not plotted.":
    "Las tasas conservan su escala natural de 0 a 100; las tasas donde un valor menor es mejor se invierten. La distancia académica asigna −150 a 0, el estándar a 50 y +150 a 100. Los valores faltantes no se muestran.",
  "Data coverage: {available}/{total}":
    "Cobertura de datos: {available}/{total}",
  " · {percent}% of weight": " · {percent}% del peso",
  "{metric} weight": "Peso de {metric}",
  "Normalize to 100%": "Normalizar al 100%",
  "Missing indicators are excluded and remaining weights are rebalanced. Compare data coverage and grade span before comparing scores.":
    "Los indicadores faltantes se excluyen y los pesos restantes se reequilibran. Compara la cobertura de datos y los grados antes de comparar puntuaciones.",
  "{count} selected": "{count} seleccionadas",
  "Locations are approximate and shown for context only. Verify attendance boundaries with the district.":
    "Las ubicaciones son aproximadas y solo brindan contexto. Verifica los límites de asistencia con el distrito.",
  "Chart legend": "Leyenda del gráfico",
  "{label} baseline": "Referencia: {label}",
  "{metric} from {start} to {end}": "{metric} de {start} a {end}",
  "A comparison of {count} selected schools{baseline} for the selected student group.":
    "Comparación de {count} escuelas seleccionadas{baseline} para el grupo estudiantil elegido.",
  " and the {label} baseline": " y la referencia {label}",
  students: "estudiantes",
  School: "Escuela",
  Students: "Estudiantes",
  Change: "Cambio",
  "{year} denominator": "Denominador de {year}",
  "Exact {metric} values for selected schools":
    "Valores exactos de {metric} para las escuelas seleccionadas",
  "Suppressed values remain hidden. Small-sample results should be treated as directional, not conclusive.":
    "Los valores suprimidos permanecen ocultos. Los resultados de muestras pequeñas deben interpretarse como orientativos, no concluyentes.",
  Reliable: "Confiable",
  "{years} public directory": "Directorio público de {years}",
  "Staffing and enrollment describe school context. They are not quality ratings.":
    "El personal y la matrícula describen el contexto escolar. No son calificaciones de calidad.",
  "Directory designations": "Designaciones del directorio",
  "Add a school to see its directory profile.":
    "Agrega una escuela para ver su perfil del directorio.",
  "Students per reported teacher is enrollment divided by reported teacher staff. It is not a class-size measure. Directory designations are shown for context only.":
    "Los estudiantes por docente reportado se calculan dividiendo la matrícula entre los docentes reportados. No es una medida del tamaño de clase. Las designaciones del directorio solo brindan contexto.",
  "Use {count}-school peer baseline":
    "Usar referencia de {count} escuelas pares",
  "How context matching works": "Cómo funciona la comparación por contexto",
  "Candidates must share the school level, compatible grade span, DASS status, and virtual-school setting. Remaining profile differences are compared using enrollment, school designations, and published EL, SWD, and SED percentages. No academic, attendance, discipline, graduation, college, or career outcome is used to find peers.":
    "Las candidatas deben compartir nivel escolar, grados compatibles, estado DASS y modalidad virtual. Las demás diferencias se comparan mediante matrícula, designaciones y porcentajes publicados de EL, SWD y SED. Ningún resultado académico, de asistencia, disciplina, graduación, universidad o carrera se usa para buscar pares.",
  "Similar context peers ({count})": "Pares de contexto similar ({count})",
  "Elementary, middle, high, or combination":
    "Primaria, intermedia, secundaria o combinación",
  "At least half of the served grade span":
    "Al menos la mitad de los grados atendidos",
  "Compared on a proportional scale": "Comparada en una escala proporcional",
  EL: "EL",
  SWD: "SWD",
  SED: "SED",
  "Academic outcomes are never used to find similar schools. Similarity is context, not a quality rating or enrollment assignment.":
    "Los resultados académicos nunca se usan para buscar escuelas similares. La similitud es contexto, no una calificación de calidad ni una asignación de matrícula.",
  "{label} reference": "Referencia: {label}",
  "It is context, not a target.": "Es contexto, no una meta.",
  "Use separate evidence and context. Treat the experimental composite as an optional lens, not a school rating.":
    "Usa evidencia y contexto por separado. Considera el índice compuesto experimental como una perspectiva opcional, no una calificación escolar.",
  "Reference context, map, and caveats":
    "Contexto de referencia, mapa y advertencias",
  "Where the data comes from and how it is calculated":
    "De dónde provienen los datos y cómo se calculan",
  "The selected-school map uses published coordinates for orientation. Proximity never determines enrollment eligibility.":
    "El mapa usa coordenadas publicadas como orientación. La proximidad nunca determina la elegibilidad de matrícula.",
  "Peer sets use public institutional context only. They do not produce a quality score or determine enrollment eligibility.":
    "Los grupos de pares solo usan contexto institucional público. No producen una puntuación de calidad ni determinan la elegibilidad de matrícula.",
  "Values are derived from official public CDE files. Source suppression is preserved, and raw files are not redistributed or relicensed.":
    "Los valores provienen de archivos públicos oficiales del CDE. Se preserva la supresión de datos y los archivos originales no se redistribuyen ni vuelven a licenciarse.",
  "This independent open-source project is not affiliated with or endorsed by the California Department of Education.":
    "Este proyecto independiente de código abierto no está afiliado ni respaldado por el Departamento de Educación de California.",
  "Calculated from official district rows, weighted by the published student denominator.":
    "Calculada con filas oficiales del distrito, ponderadas por el denominador estudiantil publicado.",
  "Calculated after matching from public school rows, weighted by each published student denominator. Suppressed values are excluded.":
    "Calculada tras la comparación con filas de escuelas públicas, ponderadas por cada denominador estudiantil publicado. Se excluyen los valores suprimidos.",
  "Official CDE county aggregate.": "Agregado oficial del condado del CDE.",
  "Official CDE statewide aggregate.": "Agregado estatal oficial del CDE.",
  "Official CDE district aggregate.": "Agregado oficial del distrito del CDE.",
  "A matching public reference may be unavailable for this metric or student group.":
    "Puede no existir una referencia pública equivalente para este indicador o grupo estudiantil.",
  "Family Decision Brief": "Informe de decisión familiar",
  "From a new address to an explainable school shortlist.":
    "De una nueva dirección a una lista breve de escuelas explicable.",
  "Edit search": "Editar búsqueda",
  "Search context": "Contexto de búsqueda",
  "Any grade": "Cualquier grado",
  "{radius} miles": "{radius} millas",
  "{distance} miles": "{distance} millas",
  "Evidence priorities": "Prioridades de evidencia",
  Academics: "Rendimiento académico",
  Climate: "Clima escolar",
  Readiness: "Preparación",
  "Selected from the location search. The score summarizes available evidence and is not a rank.":
    "Seleccionadas de la búsqueda por ubicación. La puntuación resume la evidencia disponible y no es una clasificación.",
  "{available} of {total} indicators": "{available} de {total} indicadores",
  "{indicator} is the strongest weighted driver at {score}/100 and {weight}% of available weight.":
    "{indicator} es el factor ponderado más fuerte con {score}/100 y {weight}% del peso disponible.",
  "Actual source values retain their reporting years and reliability state.":
    "Los valores originales conservan sus años de reporte y estado de confiabilidad.",
  Indicator: "Indicador",
  "No published year": "Sin año publicado",
  "Direction follows each indicator definition; missing years are never connected.":
    "La dirección sigue la definición de cada indicador; los años faltantes nunca se conectan.",
  "Deterministic statements derived from the values above—no generated interpretation.":
    "Declaraciones deterministas derivadas de los valores anteriores, sin interpretación generada.",
  "Strongest evidence": "Evidencia más sólida",
  "Material difference": "Diferencia relevante",
  "Data gaps": "Datos faltantes",
  "Before you decide": "Antes de decidir",
  "District boundaries, enrollment rules, programs, admissions, and transportation can change. Confirm current options directly with each school or district. Missing and suppressed values are not estimated.":
    "Los límites distritales, reglas de matrícula, programas, admisiones y transporte pueden cambiar. Confirma las opciones vigentes directamente con cada escuela o distrito. Los valores faltantes o suprimidos no se estiman.",
  "Sources & methodology": "Fuentes y metodología",
  "Read methodology": "Leer metodología",
  "View source notes": "Ver notas de las fuentes",
  "{school} {metric} three-year trend":
    "Tendencia de tres años de {metric} para {school}",
  "1 year": "1 año",
  improved: "mejoró",
  declined: "disminuyó",
  stable: "estable",
  "Official district area · {year}": "Área distrital oficial · {year}",
  "No geographic district returned": "No se encontró un distrito geográfico",
  "District at this address": "Distrito en esta dirección",
  "Districts at this address": "Distritos en esta dirección",
  "Map view": "Vista del mapa",
  "Nearby view": "Vista cercana",
  "Full district": "Distrito completo",
  "This confirms district jurisdiction at the matched point. It does not identify an assigned school; verify current attendance zones and enrollment rules with the district.":
    "Esto confirma la jurisdicción distrital en el punto encontrado. No identifica una escuela asignada; verifica las zonas de asistencia y reglas de matrícula vigentes con el distrito.",
  "Personalize results": "Personalizar resultados",
  "Child's grade": "Grado del estudiante",
  "School type": "Tipo de escuela",
  "Location school type": "Tipo de escuela para la ubicación",
  "Minimum evidence": "Evidencia mínima",
  "Minimum evidence coverage": "Cobertura mínima de evidencia",
  "{priority} priority": "Prioridad: {priority}",
  Less: "Menos",
  Standard: "Estándar",
  More: "Más",
  Highest: "Máxima",
  "Reset preferences": "Restablecer preferencias",
  "Priorities multiply the published grade-band weights; they do not add new data or change source values.":
    "Las prioridades multiplican los pesos publicados por nivel; no agregan datos ni cambian los valores originales.",
  "Evidence {available}/{total} · {percent}%":
    "Evidencia {available}/{total} · {percent}%",
  "Primary driver: {indicator} · {score}/100 at {weight}% of available weight":
    "Factor principal: {indicator} · {score}/100 con {weight}% del peso disponible",
  "Added to comparison": "Agregada a la comparación",
  "Comparison full": "Comparación completa",
  "Adding…": "Agregando…",
  "Add to comparison": "Agregar a la comparación",
  "Remove from brief": "Quitar del informe",
  "Brief full": "Informe completo",
  "Add to brief": "Agregar al informe",
  "{grade} options": "Opciones de {grade}",
  "{band} schools": "Escuelas de {band}",
  "{eligible} eligible · {nearby} nearby":
    "{eligible} elegibles · {nearby} cercanas",
  "No schools meet the selected grade, type, and evidence coverage in this radius.":
    "Ninguna escuela cumple el grado, tipo y cobertura de evidencia seleccionados dentro de este radio.",
  "Share link ready — copy it below":
    "El enlace está listo; cópialo a continuación",
  "Enter a California work address, city, or ZIP to see transparent evidence matches by school level.":
    "Ingresa una dirección de trabajo, ciudad o código postal de California para ver coincidencias transparentes por nivel escolar.",
  "Work address or California place":
    "Dirección de trabajo o lugar en California",
  "Location search radius": "Radio de búsqueda de ubicación",
  "Finding…": "Buscando…",
  "Find schools": "Buscar escuelas",
  " · Approximate center": " · Centro aproximado",
  "Compare selected ({count})": "Comparar seleccionadas ({count})",
  "Select up to three schools from the evidence matches below.":
    "Selecciona hasta tres escuelas de las coincidencias siguientes.",
  "{count} of 3 selected": "{count} de 3 seleccionadas",
  "Create brief": "Crear informe",
  "Share URL": "URL para compartir",
  "Location finder share URL": "URL de búsqueda por ubicación",
  "Search location": "Ubicación de búsqueda",
  "Unified district": "Distrito unificado",
  "Elementary district": "Distrito de primaria",
  "High school district": "Distrito de secundaria",
  "District boundary unavailable: {error}":
    "Límite distrital no disponible: {error}",
  "How these matches are ordered": "Cómo se ordenan estas coincidencias",
  "Evidence matches within {radius} miles for {grade} at {coverage}%+ coverage. Distance is not part of the score and only breaks ties.":
    "Coincidencias de evidencia en {radius} millas para {grade} con cobertura de {coverage}% o más. La distancia no forma parte de la puntuación y solo desempata.",
  "Elementary and middle: ELA 35%, mathematics 35%, chronic absence 20%, suspension 10%. High school: ELA 20%, mathematics 20%, CCI 12%, graduation 12%, chronic absence 10%, A–G 8%, dropout 8%, suspension 10%.":
    "Primaria e intermedia: ELA 35%, matemáticas 35%, ausentismo crónico 20%, suspensión 10%. Secundaria: ELA 20%, matemáticas 20%, CCI 12%, graduación 12%, ausentismo crónico 10%, A–G 8%, deserción 8%, suspensión 10%.",
  "Your priorities multiply these base weights. Only reliable latest-year all-student values count. Results need at least {coverage}% of their selected evidence weight and one academic indicator. This is an experimental local evidence order, not a CDE rating or a claim that one school is best for every child. Nearby does not mean assigned or eligible.":
    "Tus prioridades multiplican estos pesos base. Solo cuentan valores confiables del año más reciente para todos los estudiantes. Los resultados requieren al menos {coverage}% del peso de evidencia seleccionado y un indicador académico. Es un orden experimental de evidencia local, no una calificación del CDE ni una afirmación de que una escuela sea la mejor para cada estudiante. Estar cerca no significa estar asignada ni ser elegible.",
  "Protected characteristics are not used to rank housing locations. Official subgroup outcomes remain available after schools are added to comparison.":
    "Las características protegidas no se usan para clasificar ubicaciones de vivienda. Los resultados oficiales por subgrupo siguen disponibles al agregar escuelas a la comparación.",
  "Street addresses are sent to the U.S. Census Geocoder through this Worker. Exact matched coordinates are then sent to the official CDE district-area service. This project does not store either request. City and ZIP searches use approximate centers derived from published school locations and do not claim a district match. A share link contains the displayed search center and is created only when you choose Copy share link. This product uses the U.S. Census Bureau Geocoder but is not endorsed or certified by the Census Bureau.":
    "Las direcciones se envían al geocodificador del Censo de EE. UU. mediante este Worker. Las coordenadas exactas encontradas se envían después al servicio oficial de áreas distritales del CDE. Este proyecto no almacena ninguna solicitud. Las búsquedas por ciudad y código postal usan centros aproximados derivados de ubicaciones escolares publicadas y no afirman una coincidencia distrital. El enlace contiene el centro mostrado y solo se crea al elegir Copiar enlace. Este producto usa el geocodificador del Censo, pero no está respaldado ni certificado por la Oficina del Censo.",
  "No trend": "Sin tendencia",
  "{metric} three-year trend": "Tendencia de tres años de {metric}",
  Schools: "Escuelas",
  "reported teachers": "docentes reportados",
  "Open comparison": "Abrir comparación",
  "Comparison is full": "La comparación está completa",
  "Add to compare": "Agregar a la comparación",
  "Profile link copied": "Enlace del perfil copiado",
  "Profile link is ready in the address bar":
    "El enlace del perfil está listo en la barra de direcciones",
  "Profile data years": "Años de datos del perfil",
  "Release {release}": "Versión {release}",
  "Latest available": "Más reciente disponible",
  "Latest available by measure": "Más reciente por indicador",
  "Context, not a rating.": "Contexto, no una calificación.",
  Measure: "Medida",
  Year: "Año",
  Reliability: "Confiabilidad",
  "Same district reference": "Referencia del mismo distrito",
  "Values retain each official reporting year. Suppressed results remain hidden.":
    "Los valores conservan cada año oficial de reporte. Los resultados suprimidos permanecen ocultos.",
  "Outcome details": "Detalles de resultados",
  "Explore one indicator and student group without changing this profile URL.":
    "Explora un indicador y grupo estudiantil sin cambiar la URL del perfil.",
  "Compared with {district}": "Comparado con {district}",
  "the same district": "el mismo distrito",
  "Profile indicator": "Indicador del perfil",
  "Student group": "Grupo de estudiantes",
  "Profile student group": "Grupo estudiantil del perfil",
  Direction: "Dirección",
  "Higher values are generally more favorable for this measure.":
    "Los valores más altos suelen ser más favorables para esta medida.",
  "Lower values are generally more favorable for this measure.":
    "Los valores más bajos suelen ser más favorables para esta medida.",
  "This measure is descriptive and has no preferred direction.":
    "Esta medida es descriptiva y no tiene una dirección preferida.",
  "{reliability} based on the published result.":
    "{reliability} según el resultado publicado.",
  "Reporting year": "Año de reporte",
  "{year} is the latest available year for this selection.":
    "{year} es el año más reciente disponible para esta selección.",
  "No public value is available for this selection.":
    "No hay un valor público disponible para esta selección.",
  "Directory context describes who is served. It is not a quality measure.":
    "El contexto del directorio describe a quién atiende la escuela. No es una medida de calidad.",
  "Small groups may be suppressed to protect student privacy.":
    "Los grupos pequeños pueden suprimirse para proteger la privacidad estudiantil.",
  "Use the student-group control above to review matching outcome evidence where published.":
    "Usa el control de grupo estudiantil para revisar evidencia de resultados cuando esté publicada.",
  "Teaching and resources": "Docencia y recursos",
  "Each measure keeps its own official reporting year.":
    "Cada medida conserva su propio año oficial de reporte.",
  "Loading teaching and resource context…":
    "Cargando contexto docente y de recursos…",
  "Fully credentialed assignments": "Asignaciones con credencial completa",
  "{years} years": "{years} años",
  "Year unavailable": "Año no disponible",
  "Reported class-size range": "Rango de tamaño de clase reportado",
  "Pupils per academic counselor": "Alumnos por consejero académico",
  "Teacher experience context": "Contexto de experiencia docente",
  "Average reported years of experience":
    "Promedio de años de experiencia reportados",
  "Descriptive context, not a rating or class-size measure.":
    "Contexto descriptivo, no una calificación ni medida del tamaño de clase.",
  "Published coordinates support orientation only.":
    "Las coordenadas publicadas solo sirven como orientación.",
  Address: "Dirección",
  "CDS code": "Código CDS",
  "Official files are shown with their actual reporting years and suppression rules.":
    "Los archivos oficiales se muestran con sus años de reporte y reglas de supresión reales.",
  "Updated {date}": "Actualizado el {date}",
  "Primary sources": "Fuentes principales",
  "Read with care": "Interpretar con cuidado",
  "Missing and suppressed values are never reconstructed as zero. Different sections may use different reporting years. School context does not establish causation, assignment, or enrollment eligibility.":
    "Los valores faltantes y suprimidos nunca se reconstruyen como cero. Las secciones pueden usar años de reporte distintos. El contexto escolar no establece causalidad, asignación ni elegibilidad de matrícula.",
  "School profile not found": "Perfil escolar no encontrado",
  "This CDS code is not in the current public-school directory. Search for another school or return to comparison.":
    "Este código CDS no está en el directorio actual de escuelas públicas. Busca otra escuela o vuelve a la comparación.",
  "Return to comparison": "Volver a la comparación",
  "Official teaching context": "Contexto docente oficial",
  "Teaching and school resources": "Docencia y recursos escolares",
  "Compare teacher experience, assignment context, class size, and student support reported in official public data.":
    "Compara experiencia docente, contexto de asignaciones, tamaño de clase y apoyo estudiantil reportados en datos públicos oficiales.",
  "Data reporting years": "Años de reporte de datos",
  "Latest staff data year": "Año más reciente de datos de personal",
  "Class size and support": "Tamaño de clase y apoyo",
  "Latest preparation year": "Año más reciente de preparación",
  "Loading teaching and resource records…":
    "Cargando registros docentes y de recursos…",
  "Comparable context": "Contexto comparable",
  "At a glance": "Resumen rápido",
  "Each row keeps its official reporting year":
    "Cada fila conserva su año oficial de reporte",
  years: "años",
  percent: "porcentaje",
  ratio: "proporción",
  "Teacher experience": "Experiencia docente",
  "Teacher headcounts, not full-time equivalents":
    "Número de docentes, no equivalentes de tiempo completo",
  "average years of experience": "años promedio de experiencia",
  "Experienced teacher share not reported":
    "Proporción de docentes con experiencia no reportada",
  "Total teachers": "Total de docentes",
  "More than two years": "Más de dos años",
  "District experience": "Experiencia en el distrito",
  "Teacher preparation and placement": "Preparación y asignación docente",
  "Assignment context": "Contexto de asignaciones",
  "Data year": "Año de datos",
  "Fully credentialed": "Con credencial completa",
  Intern: "Practicante",
  "Without credentials or misassigned":
    "Sin credenciales o con asignación incorrecta",
  "Out-of-field": "Fuera de su área",
  Unknown: "Desconocido",
  "Teaching-position FTE:": "FTE de puestos docentes:",
  "Students per reported class": "Estudiantes por clase reportada",
  "Class size": "Tamaño de clase",
  "Grade or subject": "Grado o materia",
  "Grade 1": "Grado 1",
  "Grade 2": "Grado 2",
  "Grade 3": "Grado 3",
  "Grade 4": "Grado 4",
  "Grade 5": "Grado 5",
  "Grade 6": "Grado 6",
  "Other elementary": "Otra primaria",
  Science: "Ciencias",
  "Social science": "Ciencias sociales",
  "No class-size values are reported for this selection and year.":
    "No se reportan valores de tamaño de clase para esta selección y año.",
  "Class-size bands are published with the source records. Averages are shown by grade or subject and are not combined into a school rating.":
    "Los intervalos de tamaño de clase se publican con los registros originales. Los promedios se muestran por grado o materia y no se combinan en una calificación escolar.",
  "Student support": "Apoyo estudiantil",
  "Blank source values remain Not reported":
    "Los valores vacíos permanecen como No reportado",
  Role: "Función",
  Counselor: "Consejero",
  Psychologist: "Psicólogo",
  "Social worker": "Trabajador social",
  Nurse: "Enfermero",
  "Speech/language/hearing specialist":
    "Especialista en habla, lenguaje y audición",
  "Library media teacher": "Docente de medios bibliotecarios",
  "Library services staff": "Personal de servicios bibliotecarios",
  "Resource specialist": "Especialista de recursos",
  "Other support staff": "Otro personal de apoyo",
  "FTE (full-time equivalent)": "FTE (equivalente de tiempo completo)",
  "One FTE represents one person working full time for the entire school year. Headcounts and FTE are not interchangeable.":
    "Un FTE representa a una persona que trabaja tiempo completo durante todo el año escolar. El número de personas y los FTE no son intercambiables.",
  "Different reporting years": "Años de reporte distintos",
  "Staff experience is 2025–26, SARC class size and support are 2024–25, and teacher preparation currently ends in 2023–24.":
    "La experiencia del personal corresponde a 2025–26, el tamaño de clase y apoyo SARC a 2024–25, y la preparación docente termina actualmente en 2023–24.",
  "Missing data": "Datos faltantes",
  "Not reported means the source was blank, zero indicated no usable counselor ratio, or the school could not be matched to the current directory.":
    "No reportado significa que la fuente estaba vacía, que cero no permitía calcular una proporción de consejeros o que la escuela no pudo vincularse al directorio actual.",
  "Use these measures alongside outcomes and school context. They describe conditions, not school quality by themselves.":
    "Usa estas medidas junto con los resultados y el contexto escolar. Describen condiciones, no la calidad escolar por sí solas.",
  "The latest official files do not all describe the same year, so every section keeps its own date.":
    "Los archivos oficiales más recientes no corresponden todos al mismo año, por lo que cada sección conserva su fecha.",
  "Not a rating": "No es una calificación",
  "Higher or lower is not automatically better. Program design, grade span, enrollment, and local context matter.":
    "Un valor mayor o menor no es automáticamente mejor. Importan el diseño del programa, los grados, la matrícula y el contexto local.",
  "Values are derived from official CDE files. Raw files are not redistributed or relicensed.":
    "Los valores provienen de archivos oficiales del CDE. Los archivos originales no se redistribuyen ni vuelven a licenciarse.",
  "Chronic absenteeism rate": "Tasa de ausentismo crónico",
  "Chronic absence": "Ausentismo crónico",
  "College-going rate within 12 months":
    "Tasa de ingreso a la universidad en 12 meses",
  "College-going within 12 months": "Ingreso a la universidad en 12 meses",
  "ELA distance from standard": "Distancia de ELA respecto al estándar",
  "Mathematics distance from standard":
    "Distancia de matemáticas respecto al estándar",
  "Share of regular high school diploma graduates meeting UC/CSU entrance requirements.":
    "Proporción de graduados con diploma regular que cumplen los requisitos de ingreso de UC/CSU.",
  "Share of eligible cumulative enrollment identified as chronically absent.":
    "Proporción de la matrícula acumulada elegible identificada con ausentismo crónico.",
  "Share of students in the California College/Career Indicator who are placed in the Prepared level.":
    "Proporción de estudiantes del Indicador de Universidad/Carrera de California ubicados en el nivel Preparado.",
  "Share of California public high school completers who enrolled in a U.S. postsecondary institution within 12 months of completing high school.":
    "Proporción de egresados de secundarias públicas de California que se matricularon en una institución postsecundaria de EE. UU. dentro de los 12 meses posteriores.",
  "Average distance in scale-score points from the grade-level standard in English language arts/literacy.":
    "Distancia promedio en puntos de escala respecto al estándar del grado en lengua y literatura inglesa/alfabetización.",
  "Share of the adjusted four-year cohort reported as dropouts.":
    "Proporción de la cohorte ajustada de cuatro años reportada como deserción.",
  "Share of the adjusted four-year cohort receiving a regular high school diploma.":
    "Proporción de la cohorte ajustada de cuatro años que recibe un diploma regular de secundaria.",
  "Average distance in scale-score points from the grade-level standard in mathematics.":
    "Distancia promedio en puntos de escala respecto al estándar del grado en matemáticas.",
  "Share of cumulative enrollment represented by unduplicated students suspended at least once.":
    "Proporción de la matrícula acumulada representada por estudiantes no duplicados suspendidos al menos una vez.",
  "CDE Adjusted Cohort Graduation Rate and Outcome Data":
    "Datos del CDE sobre tasa de graduación de cohorte ajustada y resultados",
  "CDE Chronic Absenteeism Data": "Datos de ausentismo crónico del CDE",
  "CDE College/Career Indicator Data":
    "Datos del Indicador de Universidad/Carrera del CDE",
  "CDE College-Going Rate for High School Completers (12-Month)":
    "Tasa del CDE de ingreso a la universidad para egresados (12 meses)",
  "CDE Academic Indicator Data": "Datos del indicador académico del CDE",
  "CDE Suspension Data": "Datos de suspensiones del CDE",
  "CDE Staff Experience Data": "Datos de experiencia del personal del CDE",
  "CDE School Accountability Report Card Data":
    "Datos del Informe de Responsabilidad Escolar del CDE",
  "California Alternate Assessment": "Evaluación Alternativa de California",
  "English learners only": "Solo aprendices de inglés",
  "English only": "Solo inglés",
  "Foster youth": "Jóvenes en cuidado temporal",
  "Homeless students": "Estudiantes sin hogar",
  "Long-term English learners": "Aprendices de inglés a largo plazo",
  "Migrant students": "Estudiantes migrantes",
  "Recently reclassified English learners":
    "Aprendices de inglés reclasificados recientemente",
  "Smarter Balanced assessment": "Evaluación Smarter Balanced",
  "African American": "Afroamericano",
  "American Indian or Alaska Native": "Indígena americano o nativo de Alaska",
  Asian: "Asiático",
  Filipino: "Filipino",
  "Hispanic or Latino": "Hispano o latino",
  "Pacific Islander": "Isleño del Pacífico",
  "Race or ethnicity not reported": "Raza o etnia no reportada",
  "Two or more races": "Dos o más razas",
  White: "Blanco",
  Female: "Femenino",
  Male: "Masculino",
  "Missing gender": "Género no reportado",
  "Non-binary gender": "Género no binario",
  "Grades 1–3": "Grados 1–3",
  "Grades 4–6": "Grados 4–6",
  "Grades 7–8": "Grados 7–8",
  "Grades 9–12": "Grados 9–12",
  "Grades TK–8": "Grados TK–8",
  "Grades TK–K": "Grados TK–K",
  "Small sample": "Muestra pequeña",
  Suppressed: "Suprimido",
  "Method break": "Cambio metodológico",
  "No reliable latest-year brief indicator is available.":
    "No hay un indicador confiable disponible del año más reciente.",
  "Not enough comparable latest-year evidence is available to describe a material difference.":
    "No hay suficiente evidencia comparable del año más reciente para describir una diferencia relevante.",
  steady: "estable",
  "At standard": "En el estándar",
  Evidence: "Evidencia",
  "The location map could not be loaded.":
    "No se pudo cargar el mapa de ubicación.",
  "Location recommendation map": "Mapa de recomendaciones por ubicación",
  "Nearby search center": "Centro de búsqueda cercana",
  "The discovery map could not be loaded.":
    "No se pudo cargar el mapa de búsqueda.",
  "No mapped schools match the current search.":
    "Ninguna escuela con ubicación coincide con la búsqueda actual.",
  "School discovery map": "Mapa de búsqueda de escuelas",
  "The interactive map could not be loaded.":
    "No se pudo cargar el mapa interactivo.",
  "Coordinates are not available for the selected schools.":
    "No hay coordenadas disponibles para las escuelas seleccionadas.",
  "Selected schools map": "Mapa de escuelas seleccionadas",
  Location: "Ubicación",
  "English Learner": "Aprendiz de inglés",
  "Students with Disabilities": "Estudiantes con discapacidades",
  "Socioeconomically Disadvantaged": "En desventaja socioeconómica",
  "Grades not reported": "Grados no reportados",
  "The requested CDS code is not in the current directory.":
    "El código CDS solicitado no está en el directorio actual.",
  "Unable to load public data.": "No se pudieron cargar los datos públicos.",
  "Unable to load this school profile.":
    "No se pudo cargar este perfil escolar.",
  "Unable to load school data.": "No se pudieron cargar los datos escolares.",
  "Unable to prepare the decision brief.":
    "No se pudo preparar el informe de decisión.",
  "Enter a California address, city, or ZIP.":
    "Ingresa una dirección, ciudad o código postal de California.",
  "The official district boundary could not be resolved.":
    "No se pudo determinar el límite distrital oficial.",
  "The location could not be resolved.": "No se pudo determinar la ubicación.",
  "College-going data currently end in 2022–23 and use a high-school-completer denominator that differs from the four-year graduation cohort. National Student Clearinghouse privacy blocks can make observed enrollment lower than actual enrollment.":
    "Los datos de ingreso a la universidad terminan actualmente en 2022–23 y usan un denominador de egresados distinto de la cohorte de graduación de cuatro años. Los bloqueos de privacidad de National Student Clearinghouse pueden hacer que la matrícula observada sea menor que la real.",
  "The CCI denominator can include students from two graduation cohort types. Prepared pathways and rules can change between Dashboard releases, so read trends with the source methodology in view.":
    "El denominador del CCI puede incluir estudiantes de dos tipos de cohorte de graduación. Las vías de preparación y reglas pueden cambiar entre versiones del Dashboard; interpreta las tendencias junto con la metodología original.",
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (source: string, values?: Record<string, string | number>) => string;
}

function translateSpanishPattern(source: string) {
  let match = source.match(
    /^(.+) is the strongest normalized signal at (.+) \((.+)\)\.$/,
  );
  if (match) {
    return `${spanish[match[1]!] ?? match[1]} es la señal normalizada más fuerte con ${match[2]} (${match[3]}).`;
  }
  match = source.match(/^(.+) reports all (\d+) brief indicators\.$/);
  if (match) {
    return `${match[1]} reporta los ${match[2]} indicadores del informe.`;
  }
  match = source.match(
    /^(.+) does not report (.+) in the latest available brief years\.$/,
  );
  if (match) {
    const indicators = match[2]!
      .split(", ")
      .map((indicator) => spanish[indicator] ?? indicator)
      .join(", ");
    return `${match[1]} no reporta ${indicators} en los años más recientes disponibles.`;
  }
  match = source.match(
    /^The widest normalized difference is (.+): (.+) reports (.+), compared with (.+) at (.+)\.$/,
  );
  if (match) {
    return `La mayor diferencia normalizada corresponde a ${spanish[match[1]!] ?? match[1]}: ${match[2]} reporta ${match[3]}, frente a ${match[4]} en ${match[5]}.`;
  }
  match = source.match(/^Same (.+) grade span$/);
  if (match) return `Mismo rango de grados ${match[1]}`;
  match = source.match(/^(\d+)% grade overlap$/);
  if (match) return `${match[1]}% de coincidencia de grados`;
  match = source.match(/^Enrollment within (\d+)%$/);
  if (match) return `Matrícula dentro de un ${match[1]}%`;
  match = source.match(/^(EL|SWD|SED) share within (\d+) points?$/);
  if (match)
    return `Proporción ${match[1]} con diferencia máxima de ${match[2]} puntos`;
  if (source === "Both charter schools") return "Ambas son escuelas chárter";
  if (source === "Both Title I") return "Ambas son Título I";
  if (source === "Both magnet programs") return "Ambas son programas magnet";
  match = source.match(/^(\d+) points (above|below) standard$/);
  if (match)
    return `${match[1]} puntos ${match[2] === "above" ? "por encima" : "por debajo"} del estándar`;
  return source;
}

function interpolate(
  template: string,
  values: Record<string, string | number> = {},
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}

export function translate(
  locale: Locale,
  source: string,
  values?: Record<string, string | number>,
) {
  return interpolate(
    locale === "es"
      ? (spanish[source] ?? translateSpanishPattern(source))
      : source,
    values,
  );
}

function initialLocale(): Locale {
  if (typeof window === "undefined" || !window.localStorage) {
    return "en";
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "es" ? "es" : "en";
  } catch {
    return "en";
  }
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => undefined,
  t: (source, values) => translate("en", source, values),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage?.setItem(STORAGE_KEY, locale);
    } catch {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }
  }, [locale]);

  const t = useCallback(
    (source: string, values?: Record<string, string | number>) =>
      translate(locale, source, values),
    [locale],
  );
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function localeCode(locale: Locale) {
  return locale === "es" ? "es-US" : "en-US";
}
