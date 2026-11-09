// ICT 201/301/309/322/418 + SEN 401/410 video banks.
// Sourcing per docs/sourcing-quality-process.txt:
// - ONE winner per topic (order preserved); backups noted in research, NOT imported.
// - ICT 201: Neso COA/MP/CN, CS50T, Messer N10-009, Jeremy CCNA, Kevin Stratvert.
// - ICT 301: NPTEL Satellite (Bandyopadhyay), ENGINEERING TUTORIAL sat series,
//   Neso CN, NPTEL 3G/4G + 5G, Bose wireless.
// - ICT 309: Bose NPTEL wireless, NPTEL 3G/4G + 5G, Messer SY0.
// - ICT 322: NPTEL Entrepreneurship Essentials (Mondal, IIT KGP).
// - ICT 418: GSH Electrical, Neso, Jeremy, Messer N10, zenmurali, Sparky Help.
// - SEN 401/410: NPTEL SE, MIT Missing Semester, PLISS, UVA, Tech Trek,
//   TutorialsPoint, Mike Clayton, Douglas Schmidt, UMass, CSCI lectures,
//   Ian Sommerville (author). (BookSpokify/SE@Google TTS readings removed
//   for low engagement/quality.)
// - Comments proof per series in research.
// - GAPS: ICT 201 app-level topics (7), ICT 301 niche sat topics (21),
//   ICT 309 GSM-detail/protocols/NIN (15), ICT 322 technical presentations,
//   ICT 418 regs/first-aid/BOM topics (10), SEN 401 large-scale/deprecation (2),
//   SEN 410 CBSE (1). Documented, never forced.
// - SINGLE-HOME: every video carries the EXACT curriculum topic title in `topic`.
// - Owner of bulk import: davidnwachukwum@gmail.com
// Re-runnable: wipes each course's videos first, inserts in topic order.
import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const p of [join(__dirname, '..', '.env')]) {
  try {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        process.env[m[1]] = v;
      }
    }
  } catch {}
}

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz';
const YT = id => `https://www.youtube.com/watch?v=${id}`;
const OWNER = 'davidnwachukwum@gmail.com';

// [courseCode, videoId, host, title, description, exactTopicTitle]
const ROWS = [
  // ---------- ICT 201 (19 of 26) ----------
  ['ICT 201', 'Ol8D69VKX2k', 'watch', 'Neso: Introduction to Computer Organization and Architecture', 'Basic principle of computers.', 'Basic principle of computers.'],
  ['ICT 201', 'GRInNLx3Tug', 'watch', 'Neso: Basics of Computer Architecture', 'Computer backbone.', 'Computer "backbone".'],
  ['ICT 201', '9Vx-awO6qfc', 'watch', 'Messer: Network Communication (N10)', 'Data transmission.', 'Data transmission.'],
  ['ICT 201', '6mbFO0ZLMW8', 'watch', 'CS50T: Hardware', 'Random Access Memory.', 'Random Access Memory.'],
  ['ICT 201', 'kccUxGDsMAQ', 'watch', 'CS50T: Multimedia', 'Graphic processing.', 'Graphic processing.'],
  ['ICT 201', 'Ca6rzoQm15w', 'watch', 'Messer: Copper Connectors (N10)', 'Communication ports.', 'Communication Ports.'],
  ['ICT 201', 'qDbsiVWA2Ag', 'watch', 'CS50T: Programming', 'Software types.', 'Software types.'],
  ['ICT 201', 'CNbCMb8vUo4', 'watch', 'Neso MP: Evolution of Computers (Part 1)', 'Computer types.', 'Computer types.'],
  ['ICT 201', 'TZUh1qF6ypI', 'watch', 'Messer: Device Security (N10)', 'Portable digital devices.', 'Portable digital devices.'],
  ['ICT 201', '8ExS_LYAe-M', 'watch', 'Messer: Network Types (N10)', 'Network types.', 'Network Types.'],
  ['ICT 201', 'n_KghQP86Sw', 'watch', 'CS50T: Internet', 'Internet.', 'Internet.'],
  ['ICT 201', '5BahWbszVAY', 'watch', 'Messer: Other Useful Protocols (N10)', 'Voice over Internet Protocol.', 'Voice over Internet Protocol.'],
  ['ICT 201', 'ly8ikWtAY7s', 'watch', 'Neso: Network Protocols and Communications (Part 1)', 'Network communication.', 'Network communication.'],
  ['ICT 201', 'LnbvhoxHn8M', 'watch', 'Neso: Sliding Window Protocol', 'Internet data transfer.', 'Internet data transfer.'],
  ['ICT 201', '94dcHJfEAIo', 'watch', 'Messer: Binary Math (N10)', 'Data rate units.', 'Data rate units.'],
  ['ICT 201', 'QbEDRTjcom4', 'watch', 'Messer: Remote Access (N10)', 'Internet access.', 'Internet access.'],
  ['ICT 201', 'XyKhMocUmoo', 'watch', 'Kevin Stratvert: Word, Excel and PowerPoint for FREE', 'Office applications.', 'Office Applications (word processing, spreadsheets, presentation, etc.).'],
  ['ICT 201', 'l5Ij7nUy9UQ', 'watch', 'Kevin Stratvert: PowerPoint Tutorial for Beginners', 'Other well-known applications.', 'Other well-known applications.'],
  ['ICT 201', 'tm7i0zEitPQ', 'watch', 'Messer: VPNs (N10)', 'Remote-access technology enabling telework.', 'Telecommuting (telework).'],
  // ---------- ICT 301 (37 of 58) ----------
  ['ICT 301', 'dt4Ce8gQPns', 'watch', 'NPTEL Satellite: Lecture 01 Introduction', 'Satellite frequency bands.', 'Satellite frequency bands.'],
  ['ICT 301', 'stwJWP4h970', 'watch', 'ENGINEERING TUTORIAL: Need of Satellite Communications', 'Services, transmission and multiplexing schemes.', 'services, transmission and multiplexing schemes.'],
  ['ICT 301', 'YAjfUc7Tt24', 'watch', 'Neso: Multiple Access Protocols', 'Multiple access schemes.', 'multiple access schemes.'],
  ['ICT 301', 'o0Ug9g3N3ps', 'watch', 'ENGINEERING TUTORIAL: Satellite Orbits', 'Satellite orbit.', 'Satellite orbit.'],
  ['ICT 301', '5PA_TSBJKNk', 'watch', 'ENGINEERING TUTORIAL: Orbital Mechanics', 'Satellite motion.', 'Satellite motion.'],
  ['ICT 301', '_aRJV-W9C2Q', 'watch', 'ENGINEERING TUTORIAL: Angle of Inclination and Elevation', 'Paths.', 'Paths.'],
  ['ICT 301', 'P0AXEXi5Xxs', 'watch', 'NPTEL Satellite: Orbit 2 (GEO)', 'Geostationary satellites.', 'Geostationary satellites.'],
  ['ICT 301', '3O1aJolNIpU', 'watch', 'NPTEL Satellite: Navigation II (NGSO)', 'Non-geostationary constellations.', 'Non-geostationary constellations.'],
  ['ICT 301', 'kf03VIHfFgg', 'watch', 'NPTEL Satellite: Space Segment 1', 'Satellite subsystems.', 'Satellite subsystems.'],
  ['ICT 301', 'Ue5QmbVBPy4', 'watch', 'ENGINEERING TUTORIAL: Launching of a Satellite', 'Satellite launching.', 'Satellite launching.'],
  ['ICT 301', 'bnTqom8-C0w', 'watch', 'NPTEL Satellite: Space Segment 4 (Payload/Antennas)', 'Antennas: types, gain, pointing loss, G/T, EIRP.', 'Antennas: types, gain, pointing loss, G/T, EIRP.'],
  ['ICT 301', 'E9gCjOuTUks', 'watch', 'NPTEL Satellite: Link Budget 3 (LNA)', 'Low noise amplifiers.', 'Low noise amplifiers.'],
  ['ICT 301', '9DMERY8XU84', 'watch', 'NPTEL Satellite: Ground Segment 4 (BUC/LNB)', 'BUC/LNB conversion, polarisation, redundancy.', 'BUC/LNB: conversion process, polarisation hopping, redundancy configurations.'],
  ['ICT 301', 'Z442kCvaStY', 'watch', 'NPTEL Satellite: Ground Segment 1 (TT&C)', 'Earth station monitoring and control.', 'earth station monitoring and control.'],
  ['ICT 301', 'YJXm0iRWmp4', 'watch', 'NPTEL Satellite: Link Budget 1 (EIRP)', 'Basic link analysis.', 'Basic link analysis.'],
  ['ICT 301', 'qUzxHNOBcxw', 'watch', 'NPTEL Satellite: Propagation 1 (Attenuation)', 'Attenuation.', 'attenuation.'],
  ['ICT 301', 'V2xnZxpurVM', 'watch', 'NPTEL Satellite: Propagation 3 (Interference)', 'Sources of interference.', 'sources of interference.'],
  ['ICT 301', 's_LFXKjMeTw', 'watch', 'NPTEL Satellite: Link Budget 5 (C/N)', 'Carrier to noise and interference ratio.', 'carrier to noise and interference ratio.'],
  ['ICT 301', 'tEKAOmcgHIo', 'watch', 'NPTEL Satellite: Link Budget 8 (Availability)', 'System availability.', 'System availability.'],
  ['ICT 301', 'nMjkeEHR2j8', 'watch', 'Bose Lec-5: Cell Capacity and Reuse', 'Frequency reuse (concept transfer).', 'Frequency reuse.'],
  ['ICT 301', 'BooEExeACn4', 'watch', 'NPTEL 3G/4G: Link Budget Analysis', 'Optimised carrier to noise and intermodulation ratio.', 'Optimised carrier to noise and intermodulation ratio.'],
  ['ICT 301', 'Y2e7Si66E0o', 'watch', 'NPTEL Satellite: Link Budget 7 (Design)', 'Link design.', 'Link design.'],
  ['ICT 301', 'qc6lN92m0g4', 'watch', 'NPTEL Satellite: Nonlinearity I', 'Amplitude and phase nonlinearities.', 'Multiple access techniques: companded FDM-FM-FDMA, SSB-AM-FDMA, amplitude, and phase nonlinearities.'],
  ['ICT 301', '2bMMj5ffRrA', 'watch', 'NPTEL Satellite: Nonlinearity III (Intermodulation)', 'Optimised carrier to noise and intermodulation ratio.', 'Optimised carrier to noise and intermodulation ratio.'],
  ['ICT 301', 'vxTd4VNCaw8', 'watch', 'NPTEL Satellite: Multiple Access 3 (TDMA)', 'TDMA frame structure and efficiency.', 'TDMA: frame structure, burst structure, frame efficiency, super-frame structure, frame acquisition and synchronisation, satellite position determination.'],
  ['ICT 301', 'ZaZjtpDqqhg', 'watch', 'NPTEL Satellite: Multiple Access 4 (TDMA Advanced)', 'Advanced TDMA satellite systems.', 'advanced TDMA satellite systems.'],
  ['ICT 301', 'TJNKoRPn-G8', 'watch', 'NPTEL 3G/4G Lec-13: Intro to CDMA and Spread Spectrum', 'CDMA direct sequence.', 'CDMA: direct sequence CDMA (DS-CDMA), sequence synchronous and sequence asynchronous DS-CDMA.'],
  ['ICT 301', 'KpLB2EYVyBo', 'watch', 'NPTEL 3G/4G Lec-19: Multi-User CDMA', 'Random access DS-CDMA.', 'random access DS-CDMA.'],
  ['ICT 301', 'vhXdqEqT4Eo', 'watch', 'NPTEL Satellite: Synchronisation I', 'Acquisition and synchronisation.', 'acquisition and synchronisation.'],
  ['ICT 301', 'sHCcrzxUaWQ', 'watch', 'NPTEL Satellite: Multiple Access 5 (CDMA/DAMA/SDMA)', 'Demand assignment multiple access.', 'Demand assignment multiple access (DAMA).'],
  ['ICT 301', 'kNeq-b5pu8s', 'watch', 'NPTEL Satellite: Multiple Access 2 (FDMA)', 'Message transmission by FDMA.', 'Message transmission by FDMA.'],
  ['ICT 301', 'j4-r0e7DjqY', 'watch', 'Neso: Pure Aloha', 'Pure ALOHA satellite packet switching.', 'pure ALOHA- satellite packet switching.'],
  ['ICT 301', 'aqWTNk90zRA', 'watch', 'Neso: Slotted Aloha', 'Slotted ALOHA.', 'slotted ALOHA.'],
  ['ICT 301', '1d4R-JNfMYY', 'watch', 'NPTEL Satellite: Ground Segment 3 (VSAT)', 'VSAT networks.', 'VSAT networks.'],
  ['ICT 301', 'Eu_mTZxPofI', 'watch', 'Bose Lec-37: Wireless Networks', 'Multi-access and networking.', 'multi-access and networking.'],
  ['ICT 301', 'V118j3zOtMM', 'watch', 'NPTEL Satellite: Effect on Higher Layer II', 'Network error control.', 'network error control.'],
  ['ICT 301', 'AtVWnyDDaDI', 'watch', 'Neso: Checksum', 'Polling VSAT networks.', 'polling VSAT networks.'],
  // ---------- ICT 309 (20 of 35) ----------
  ['ICT 309', 'CUyF0YGIA5Y', 'watch', 'Bose Lec-1: Motivation and Introduction', 'Evolution of mobile radio communications.', 'Evolution of mobile radio communications.'],
  ['ICT 309', 'QHDxbbc1GWs', 'watch', 'Bose Lec-2: Types of Wireless Communication', 'Paging, cordless, cellular radio examples.', 'Examples of mobile radio systems: radio paging, cordless telephones, cellular radio.'],
  ['ICT 309', 'd7zeaz-NjmM', 'watch', 'NPTEL 5G: Evolution of Wireless Communication', 'Trends in cellular radio and personal communications.', 'Trends in cellular radio and personal communications.'],
  ['ICT 309', 'whYljse4Abc', 'watch', 'Bose Lec-4: Cellular Concept and System Design', 'Cellular system, frequency reuse, handoff, capacity.', 'A basic cellular system, Frequency reuse, Roaming, Hand-off strategies, Co-channel interference, Traffic and Grade of service, System capacity, Improving capacity of cellular system.'],
  ['ICT 309', 'lBJdZzb2cl0', 'watch', 'Bose Lec-8: Mobile Radio Propagation', 'Path loss, multipath, Rayleigh fading.', 'Propagation path loss, multi-path propagation problem, Rayleigh fading, Rician distribution.'],
  ['ICT 309', 'KKKg1X02yto', 'watch', 'Bose Lec-12: Doppler Spectrum and Jakes Model', 'Doppler effect.', 'Doppler effect.'],
  ['ICT 309', 'mfk0K9jayhw', 'watch', 'Bose Lec-37: Hata Model and Log Normal Shadowing', 'Field strength prediction models.', 'Field strength prediction models, co-channel interference and reduction, adjacent channel interference, near-far problem.'],
  ['ICT 309', 'FwtVorAfEss', 'watch', 'NPTEL 5G: Evolution 2G to 5G Part I', 'Analogue and digital cellular standards.', 'Standards and overview of analogue and digital cellular systems: AMPS, TACS, GSM, CT2, PCN, DECT, PHS.'],
  ['ICT 309', 'PNMuf8twHqw', 'watch', 'Bose Lec-21: Modulation Techniques', 'Modulation and multiple access techniques.', 'Frequency management and channel assignment, speech coding, channel coding, bandwidth consideration, equalisation, modulation techniques, multiple access techniques.'],
  ['ICT 309', 'bur9hq_abog', 'watch', 'Bose Lec-38: GSM and CDMA', 'GSM architecture and elements.', 'GSM: Architecture, elements, and standard interfaces;'],
  ['ICT 309', 'EDDEsX7vaII', 'watch', 'Bose Lec-39: GSM and CDMA Continued', 'FDMA/TDMA structure.', 'FDMA/TDMA structure;'],
  ['ICT 309', 'no-ywD1XANE', 'watch', 'Bose Lec-33: Coding Techniques', 'Speech and channel coding.', 'Speech and channel coding;'],
  ['ICT 309', 'MwCemE5N8pc', 'watch', 'NPTEL 5G: Frame Structure in 5G NR', 'Time slots and bursts.', 'time slots and bursts;'],
  ['ICT 309', 'fVkmeg4rAyQ', 'watch', 'NPTEL 5G: Waveform in 5G', 'Signalling.', 'signalling;'],
  ['ICT 309', '1n1YIOyfIqA', 'watch', 'NPTEL 5G: Waveforms in 3G Continued (Handover)', 'Hand-offs.', 'hand-offs;'],
  ['ICT 309', 'qwg3viAUuRQ', 'watch', 'NPTEL 5G: Evolution Part IV', 'Third generation convergence.', 'Third Generation Wireless Standard: convergence;'],
  ['ICT 309', '7IAYkjRzsoU', 'watch', 'NPTEL 5G: Evolution Part II (UMTS)', 'UMTS.', 'UMTS;'],
  ['ICT 309', 'DXrmcQMQiT4', 'watch', 'NPTEL 5G: Waveforms in 3G (WCDMA)', 'WCDMA.', 'WCDMA;'],
  ['ICT 309', 'tSLqrKhUvts', 'watch', 'Messer: Wireless Attacks (SY0-701)', 'Security issues in wireless.', 'Security and billing issues.'],
  ['ICT 309', 'Tu5VCcx25So', 'watch', 'NPTEL Satellite: Navigation I (GPS)', 'GPS principles and applications.', 'Global Positioning System: principles, and applications.'],
  // ---------- ICT 322 (9 of 10; technical presentations = GAP) ----------
  ['ICT 322', 'HwL0jPPJa4g', 'watch', 'NPTEL Entre Essentials Lec-14: Balanced Founding Team', 'Business leadership.', 'Business leadership.'],
  ['ICT 322', 'sHjVMnghJaE', 'watch', 'NPTEL Entre Essentials Lec-16: Marketing for Startups', 'Digital marketing.', 'Digital marketing.'],
  ['ICT 322', 'eXMSp3J7ESE', 'watch', 'NPTEL Entre Essentials Lec-40: Innovation and Entrepreneurship', 'Emerging trends in entrepreneurship.', 'Emerging trends in entrepreneurship.'],
  ['ICT 322', 'tabnGRjS64c', 'watch', 'NPTEL Entre Essentials Lec-43: Dos and Don\u2019ts', 'Business ethics.', 'Business ethics.'],
  ['ICT 322', 'PdiZynKvlio', 'watch', 'NPTEL Entre Essentials Lec-38: How to Start a Startup', 'New venture creation process.', 'New venture creation process.'],
  ['ICT 322', 'EULD1e5Jiis', 'watch', 'NPTEL Entre Essentials Lec-28: Break-Even Point', 'Business feasibility planning.', 'Business feasibility planning.'],
  ['ICT 322', 'ulXMnSn00E4', 'watch', 'NPTEL Entre Essentials Lec-18: Marketing Research', 'Market research.', 'Market research.'],
  ['ICT 322', 'ZIa9-ffT1t0', 'watch', 'NPTEL Entre Essentials Lec-11: Competitive Advantage', 'Business strategy.', 'Business strategy.'],
  ['ICT 322', 'OBcLnQ7UTU4', 'watch', 'NPTEL Entre Essentials Lec-09: Business Model Generation I', 'Business models and business plans.', 'Business models and business plans.'],
  // ---------- ICT 418 (22 of 32) ----------
  ['ICT 418', '9prOIdhMncQ', 'watch', 'GSH: Would You Change This Fuse Board?', 'Electrical installation.', 'Electrical Installation.'],
  ['ICT 418', 'P2VoJ52yfoE', 'watch', 'GSH: 10 Stages of Safe Isolation (3 Phase)', 'Electrical safety.', 'Electrical safety.'],
  ['ICT 418', 'dRkzvJ_2Hn8', 'watch', 'GSH: Automatic Disconnection of Supply Explained', 'Electricity supply regulations.', 'Electricity supply regulations.'],
  ['ICT 418', 'WzSsWpK_3xA', 'watch', 'zenmurali: Illumination Engineering Part 1', 'Luminous intensity and flux.', 'Lighting and Illumination: Luminous intensity and flux.'],
  ['ICT 418', 'pUif6I0POQw', 'watch', 'zenmurali: Important Definitions and Factors', 'Maintenance factor.', 'Maintenance factor.'],
  ['ICT 418', 'hGMkuo8HG_Q', 'watch', 'Neso: Utilization Factor', 'Coefficient of utilisation.', 'Coefficient of utilisation.'],
  ['ICT 418', 'AF4RsoveL1Y', 'watch', 'GSH: Types of Lamps (LED, CFL, Halogen)', 'Types of light sources.', 'Types of light sources.'],
  ['ICT 418', 'mB573i9S39A', 'watch', 'zenmurali: Lumen/Flux Method + Problems', 'Calculation of lighting requirements.', 'Calculation of lighting requirements.'],
  ['ICT 418', 'xOpYxgnD9kg', 'watch', 'zenmurali: Flood Lighting (Glare)', 'Glare.', 'Glare.'],
  ['ICT 418', 'Tl2JsE-ihjM', 'watch', 'GSH: Twin and Earth, Flexes, SWA, PVC Singles', 'Installation materials and joints.', 'Installation Materials, cables, junction box, terminations, joints.'],
  ['ICT 418', 'TsGD6mjsbbI', 'watch', 'GSH: PVC Conduit', 'Conduits and conduiting.', 'Conduits and conduiting.'],
  ['ICT 418', '-2DRkpDUo9E', 'watch', 'GSH: Trunking Capacity Calculation', 'Trunks and trunking.', 'Trunks and trunking.'],
  ['ICT 418', 'RO0Zejib7BM', 'watch', 'GSH: New House Wiring', 'Domestic electrical installation design.', 'Electrical Installation design in domestic, commercial, and industry.'],
  ['ICT 418', 'i22OiHyWeUg', 'watch', 'GSH: Earthing Arrangements TN-C-S, TN-S and TT', 'Earthling and protection.', 'Earthling and Protection.'],
  ['ICT 418', 's14mdVzWzu4', 'watch', 'GSH: More Conductors Connected Together', 'Purposes of earthing.', 'Purposes of earthing.'],
  ['ICT 418', 'J-di10rrJNg', 'watch', 'GSH: Earth Disc to the Rescue', 'Rod electrodes.', 'Rod electrodes.'],
  ['ICT 418', 'nz3scSSg3ZU', 'watch', 'GSH: Testing Earth Fault Loop Impedance', 'Earth electrode resistance.', 'Earth electrode resistance.'],
  ['ICT 418', 'aW2a_ziwNbw', 'watch', 'GSH: TN-S or TN-C-S Earthing Arrangement', 'Earthing system.', 'Earthing system.'],
  ['ICT 418', '24Yjts1817E', 'watch', 'GSH: Earth Fault Loop Impedance Path', 'Earth fault loop impedance.', 'Earth fault loop impedance.'],
  ['ICT 418', 'BW3fQgdf4-w', 'watch', 'Jeremy: WAN Architectures (Day 53)', 'Telecom design via WAN.', 'Telecommunication design and installation: Satellite, VSAT, etc.'],
  ['ICT 418', 'vVEL1LokboE', 'watch', 'Messer: Network Architectures (N10)', 'Computer networking design and installation.', 'Computer networking design and installation.'],
  ['ICT 418', 'NeTwL-040ds', 'watch', 'Messer: Wireless Networking (N10)', 'Wireless LAN design and installation.', 'Wireless LAN design and installation.'],
  // ---------- SEN 401 (9 topics) ----------
  ['SEN 401', '6aJ8qn8yV9U', 'watch', 'What is Configuration Management? (Mike Clayton)', 'Management of the SCM process.', 'Management of the software configuration management process – organisation context for software configuration management, constraints and guidance for software configuration management process.'],
  ['SEN 401', 'nDp6uBFHfQU', 'watch', 'Configuration Management (TutorialsPoint)', 'Planning for SCM and surveillance.', 'Planning for software configuration management, software configuration management plan, and surveillance of software configuration management.'],
  ['SEN 401', '2sjqTHE0zok', 'watch', 'MIT Missing Semester: Version Control (git)', 'Identification and software library.', 'Software configuration identification and software library.'],
  ['SEN 401', 'yS2WM1Rk79k', 'watch', 'Software Maintenance (UVA CS 3240)', 'Maintenance processes and activities.', 'Software configuration control – requesting, evaluating and approving software changes, implementing software changes, and deviations and waivers.'],
  ['SEN 401', 'S3oIZfdHmLQ', 'watch', 'DevOps Lecture 11: Jenkins', 'Implementing changes and continuous integration.', 'Software configuration status accounting – software configuration status information and reporting.'],
  ['SEN 401', 'Lr4cMmaJHrg', 'watch', 'Static Program Analysis (PLISS, Anders Moller)', 'Software configuration auditing.', 'Software configuration auditing.'],
  ['SEN 401', 'zDobUyqa-HE', 'watch', 'Program Evolution Dynamics and Software Maintenance (Prof. Shirdhonkar)', 'Maintenance processes and activities.', 'Maintenance process – maintenance processes and activities.'],
  // ---------- SEN 410 (9 topics) ----------
  ['SEN 410', 'FMKv8Vozf5c', 'watch', 'Chapter 9: Software Architecture and Design', 'In-depth look at software design.', 'An in-depth look at software design.'],
  ['SEN 410', '2GZttnHChHo', 'watch', 'Douglas Schmidt: Overview of Patterns', 'Design patterns, frameworks and architectures.', 'Continuation of the study of design patterns, frameworks, and architectures.'],
  ['SEN 410', 'mRAw7O4jGFI', 'watch', 'UMass: Networks and Distributed Systems', 'Design of distributed systems.', 'Survey of current middleware architectures.'],
  ['SEN 410', '0gblD52BB5s', 'watch', 'Module 05: Service-Oriented Architecture', 'Design of service-oriented systems.', 'Design of distributed systems using middleware.'],
  ['SEN 410', 'ifjf2FA-uss', 'watch', 'Software Metrics II (CSCI 3060U)', 'Measurement theory and metrics in design.', 'Measurement theory and appropriate use of metrics in design.'],
  ['SEN 410', 'C94_arCm-Mw', 'watch', 'Availability and Reliability (Ian Sommerville)', 'Reliability, performance and safety.', 'Designing for quality attributes such as reliability, performance, safety, security, reusability, etc.'],
  ['SEN 410', '40Du7ear5v8', 'watch', 'NPTEL Lec-21: Classification of Cohesion', 'Internal qualities and complexity.', 'Measuring internal qualities and complexity of software.'],
  ['SEN 410', 'x90kIAFGYKE', 'watch', 'NPTEL Lec-12: Agile Model', 'Evaluation and evolution of designs.', 'Evaluation and evolution of designs.'],
];

async function seed() {
  const c = new MongoClient(URI, { connectTimeoutMS: 20000, serverSelectionTimeoutMS: 20000 });
  await c.connect();
  const db = c.db();
  const byCourse = {};
  for (const [courseCode, id, host, title, description, topic] of ROWS) {
    const url = YT(id);
    (byCourse[courseCode] = byCourse[courseCode] || []).push({ courseCode, url, title, description, topic, ownerEmail: OWNER, addedBy: OWNER });
  }
  for (const [courseCode, list] of Object.entries(byCourse)) {
    const existing = await db.collection('videos').countDocuments({ courseCode });
    if (existing > 0) {
      console.log(`${courseCode} has ${existing} videos. Re-seeding (doc: playlists win, single-homed)...`);
      await db.collection('videos').deleteMany({ courseCode });
    }
    await db.collection('videos').insertMany(list.map((v, i) => ({ ...v, order: i + 1 })));
    console.log(`${list.length} ${courseCode} videos inserted.`);
  }
  await c.close();
}

seed().catch(e => { console.error('Seed failed:', e.message); process.exit(1) });
