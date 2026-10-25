# OPD Saathi — Verified Hospital Map Library

This build includes **12 preloaded verified map/floor-guide profiles**. OPD Saathi labels each source by what it actually is: building layout, campus map, or official master-plan material. It does not claim a campus map is a room-level indoor floor plan.

1. **Tata Memorial Hospital, Mumbai** — official building layout / patient booklet
   - https://tmc.gov.in/event/upload/12112025_5/TMH_Brochure_%20patient%20booklet.pdf
2. **JIPMER, Puducherry** — official JIPMER campus map
   - https://jipmer.edu.in/about-us/location/jipmer-map
3. **King George's Medical University, Lucknow** — official campus map with numbered buildings
   - https://www.kgmu.org/campus_map.php
4. **PGIMER, Chandigarh** — official PGI map
   - https://pgimer.edu.in/PGIMER_PORTAL/PGIMERPORTAL/GlobalPages/JSP/Page_Data.jsp?dep_id=7
5. **AIIMS New Delhi** — official campus/master-plan material (planning source, not live room-level wayfinding)
   - https://www.aiims.edu/images/depart/Engineering%20Services/Pics_overview_of_projects.pdf
6. **Lokmanya Tilak Municipal General Hospital, Sion Mumbai** — official campus/site plan
   - https://ltmgh.com/about-ltmgh/campus-map/
   - Map image: https://ltmgh.com/wp-content/uploads/2025/09/campmap.jpg
7. **Ramaiah Medical College Hospital, Bengaluru** — official campus map in Ramaiah Medical College handbook
   - https://www.msrmc.ac.in/assets/frontend/ramaiah-medical-college/pdf/Glimpse-hand-book-2023.pdf
8. **Anugrah Narayan Magadh Medical College & Hospital, Gaya** — official Government of Bihar campus map
   - https://anmmch.bihar.gov.in/campus_map.php
9. **Government Medical College, Palakkad** — Government of Kerala institutional document with satellite campus map / block layout
   - https://health.kerala.gov.in/assets/backend/uploads/publicrelation/1774592373_69c6217559322.pdf
10. **Bangalore Baptist Hospital, Bengaluru** — official floor-by-floor hospital directory
   - https://bbh.org.in/floordirectory/
11. **Kempegowda Institute of Medical Sciences Hospital, Bengaluru** — official Eastern/Western block floor directory
   - https://www.kimsbangalore.edu.in/hospital/
12. **Aster Whitefield Hospital, Bengaluru** — official architectural floor-plan drawings published in Aster's environmental-compliance report
   - https://www.asterhospitals.in/sites/default/files/2025-07/Aster%20Hospital%20Whitefield%20Half-Yearly%20EC%20%20Compliance%20Reports..%20Sep-24%20to%20Feb-25.pdf

## Behavior for other hospitals

- If public indoor geometry is available through the live map data layer, OPD Saathi can render it.
- If a verified hospital-published floor/campus map is found in this library, OPD Saathi shows **OFFICIAL MAP FOUND**.
- Otherwise it shows **MAP NOT FOUND** and does not fabricate a hospital map.
