// The git test bed for the code-context and branch questions: a small
// codebase for Saltglass Reach, the committed 1x graph, records that anchor
// Proof to the code, and four engineers' branches with draft PRs.
// scripts/build-repo.mjs replays it into a real repository.
//
// A commit has:
//   key       a local name; record bodies and anchors refer to its hash as
//             {{sha:<key>}}, and questions find it by `subject`
//   at        the author and commit date
//   author    a person in PEOPLE
//   subject   the first line of the message; unique in the repository
//   body      optional message text after the subject
//   proof     record keys for `Proof: <id>` trailers
//   files     { path: text } to write, or { path: null } to delete
//   graph     true to copy the committed benchmark graph in
//   events    Proof mutations, replayed through the real writer
//
// Events use the build.mjs spec format with two changes. Every key is
// qualified as `<effort>.<key>`, since one commit can touch several Efforts,
// and a create event names its Effort in `effort`. One extra type exists:
//
//   { type: 'Anchor', effort, key, title, path, symbol, commit, created_by }
//
// writes a Citation with `role: code` whose body is `<path>#<symbol>@<sha>`,
// the 12-character hash of `commit`. These are the spec's declared code
// anchors; check.mjs refuses a code anchor in the graph that is not one.
//
// Branches start at the tip of main. `pr` is the draft PR that
// .flatbread/proof/prs.json maps the branch to.

export const PEOPLE = {
  ines: { name: 'Ines Okafor', login: 'ines-okafor' },
  tomasz: { name: 'Tomasz Brandt', login: 'tomasz-brandt' },
  yusuf: { name: 'Yusuf Demir', login: 'yusuf-demir' },
  rhea: { name: 'Rhea Valdés', login: 'rhea-valdes' },
  kenji: { name: 'Kenji Arakawa', login: 'kenji-arakawa' },
  marta: { name: 'Marta Lindqvist', login: 'marta-lindqvist' },
  priya: { name: 'Priya Natarajan', login: 'priya-natarajan' },
  liam: { name: "Liam O'Connell", login: 'liam-oconnell' },
  sofia: { name: 'Sofia Marchetti', login: 'sofia-marchetti' },
  dara: { name: 'Dara Whitlock', login: 'dara-whitlock' },
};

const at = (text) => `${text.replace(' ', 'T')}:00Z`;

// ---------------------------------------------------------------- code ----

const README_1 = `# Saltglass Reach

Engine, platform and tools source for Saltglass Reach, Tidewater Forge's
co-op exploration game.

| Path                                  | What lives there                       |
| ------------------------------------- | -------------------------------------- |
| \`engine/kestrel/\`                     | Kestrel: streaming, tides, saves, ECS  |
| \`engine/lantern/\`                     | Lantern, Kestrel's renderer            |
| \`platform/skiff/\`, \`platform/meridian/\` | Console ports                          |
| \`net/coop/\`                           | Co-op sync                             |
| \`tools/shadercache/\`                  | The build farm's shader compile cache  |
`;

const README_2 = `${README_1}
## Project memory

Decisions, findings and open questions live in \`.flatbread-proof/\`. Read
them with \`flatbread proof\`, never by opening the files. A commit names the
records it implements with one \`Proof: <id>\` trailer per record.
`;

const FILES_M01 = {
  'README.md': README_1,
  'Cargo.toml': `[workspace]
members = ["engine/*", "platform/*", "net/*"]
resolver = "2"
`,
  '.gitignore': `/target/
/.flatbread/
.flatbread-proof/.journal/
`,
  'engine/kestrel/lib.rs': `//! Kestrel, the Saltglass Reach engine.
pub mod ecs;
pub mod gull;
pub mod jobs;
pub mod save;
pub mod streaming;
pub mod tides;
`,
  'engine/lantern/lib.rs': `//! Lantern, Kestrel's renderer.
pub mod cull;
pub mod gi;
pub mod shadows;
pub mod tern;
pub mod tonemap;
pub mod vb;
`,
  'engine/kestrel/ecs/names.rs': `//! Debug names for entities. Release builds compile them out.
use super::Entity;

#[cfg(debug_assertions)]
pub fn debug_name(entity: Entity) -> &'static str {
    NAMES.with(|names| names.get(entity))
}

#[cfg(not(debug_assertions))]
pub fn debug_name(_entity: Entity) -> &'static str {
    ""
}
`,
  'engine/kestrel/ecs/storage.rs': `//! Component storage.
pub struct ArchetypeTable {
    pub columns: Vec<Column>,
    pub len: usize,
}

/// Tags that come and go every few frames live outside the tables.
pub struct SparseTags {
    pub dense: Vec<Entity>,
    pub sparse: Vec<u32>,
}
`,
  'engine/kestrel/jobs/pool.rs': `//! The engine job scheduler.
pub struct ThreadPool {
    workers: Vec<Worker>,
}

impl ThreadPool {
    pub fn spawn(&self, job: Job) -> JobHandle {
        self.workers[self.pick()].push(job)
    }
}
`,
  'engine/kestrel/gull/vm.rs': `//! Runs Gull scripts.
pub struct Interpreter {
    pub env: Env,
}

impl Interpreter {
    pub fn call(&mut self, func: &FuncDef, args: &[Value]) -> Value {
        self.eval_block(&func.body, args)
    }
}
`,
  'engine/lantern/shadows/local_atlas.rs': `//! Shadows for local lights: one 8k atlas, cached until something moves.
pub const ATLAS_SIZE: u32 = 8192;

pub struct LocalShadowAtlas {
    slots: Vec<AtlasSlot>,
}
`,
  'engine/lantern/gi/sdf_volumes.rs': `//! Signed-distance-field volumes for global illumination.
pub const CASCADES: usize = 4;

pub struct SdfVolumes {
    cascades: [Cascade; CASCADES],
}

impl SdfVolumes {
    pub fn update(&mut self, camera: &Camera) {
        for cascade in &mut self.cascades {
            cascade.recenter(camera.position);
        }
    }
}
`,
  'engine/lantern/cull/two_phase.rs': `//! GPU occlusion culling in two phases.
pub fn cull_phase_one(instances: &InstanceBuffer, hzb: &Hzb) -> VisibleList {
    instances.test_against(hzb)
}

pub fn cull_phase_two(rejected: &InstanceBuffer, hzb: &Hzb) -> VisibleList {
    rejected.test_against(hzb)
}
`,
  'platform/skiff/frame_modes.rs': `//! Display modes on Skiff.
pub enum FrameMode {
    Hz30,
}
`,
};

const KEY_V1 = `"""Cache keys for the farm's shader compile cache."""
import hashlib


def cache_key(source_path, compiler_version):
    """SHA-256 of the shader file text and the compiler version string."""
    digest = hashlib.sha256()
    with open(source_path, "rb") as source:
        digest.update(source.read())
    digest.update(compiler_version.encode())
    return digest.hexdigest()
`;

const KEY_V2 = `"""Cache keys for the farm's shader compile cache."""
import hashlib

from .preprocess import preprocess


def cache_key(source_path, defines, target, compiler_version):
    """SHA-256 of the preprocessed source, defines, compiler version and target."""
    digest = hashlib.sha256()
    digest.update(preprocess(source_path, defines))
    for name, value in sorted(defines.items()):
        digest.update(f"{name}={value}".encode())
    digest.update(compiler_version.encode())
    digest.update(target.encode())
    return digest.hexdigest()
`;

const KEY_V3 = `"""Cache keys for the farm's shader compile cache."""
import hashlib

from .compiler import compiler_binary_hash
from .preprocess import normalize_flags, preprocess


def cache_key(source_path, defines, target, flags):
    """SHA-256 of the key inputs, in a fixed order.

    The compiler is identified by the hash of its binary and optimizer
    library, computed once per agent at startup, not by its version string.
    """
    digest = hashlib.sha256()
    digest.update(preprocess(source_path, defines))
    for name, value in sorted(defines.items()):
        digest.update(f"{name}={value}".encode())
    digest.update(target.encode())
    digest.update(compiler_binary_hash())
    digest.update(" ".join(normalize_flags(flags)).encode())
    return digest.hexdigest()
`;

const IO_QUEUE_1 = `//! One async read queue per platform for streamed assets.
pub enum Priority {
    Proximity,
    Background,
}

pub struct IoQueue {
    lanes: [VecDeque<ReadRequest>; 2],
}

impl IoQueue {
    pub fn push_read(&mut self, request: ReadRequest, priority: Priority) {
        self.lanes[priority as usize].push_back(request);
    }

    pub fn next(&mut self) -> Option<ReadRequest> {
        self.lanes.iter_mut().find_map(|lane| lane.pop_front())
    }
}
`;

const IO_QUEUE_2 = `//! One async read queue per platform for streamed assets.
pub enum Priority {
    Tide,
    Proximity,
    Background,
}

pub struct IoQueue {
    lanes: [VecDeque<ReadRequest>; 3],
}

impl IoQueue {
    pub fn push_read(&mut self, request: ReadRequest, priority: Priority) {
        self.lanes[priority as usize].push_back(request);
    }

    /// Reads for cells the tide is about to expose go ahead of everything.
    pub fn push_tide_read(&mut self, request: ReadRequest) {
        self.lanes[Priority::Tide as usize].push_front(request);
    }

    pub fn next(&mut self) -> Option<ReadRequest> {
        self.lanes.iter_mut().find_map(|lane| lane.pop_front())
    }
}
`;

const POOL_1 = `//! The streaming pool: which cells stay resident.
pub struct CellPool {
    resident: Vec<ResidentCell>,
    budget_bytes: u64,
}

impl CellPool {
    /// Evicts the cell touched longest ago.
    pub fn evict_lru(&mut self) -> Option<CellId> {
        let oldest = self.resident.iter().min_by_key(|cell| cell.last_touched)?;
        Some(oldest.id)
    }
}
`;

const POOL_2 = `//! The streaming pool: which cells stay resident.
pub struct CellPool {
    resident: Vec<ResidentCell>,
    budget_bytes: u64,
}

const HALF_TURN_TICKS: u32 = 1_200;

impl CellPool {
    /// Lower scores go first. Cells the tide forecast needs soon are kept.
    pub fn evict_score(&self, cell: &ResidentCell, forecast: &TideForecast) -> i64 {
        if forecast.exposes_within(cell.id, HALF_TURN_TICKS) {
            return i64::MAX;
        }
        -(cell.distance_to_nearest_player as i64)
    }

    pub fn evict(&mut self, forecast: &TideForecast) -> Option<CellId> {
        let cell = self.resident.iter().min_by_key(|c| self.evict_score(c, forecast))?;
        Some(cell.id)
    }
}
`;

const POOL_3 = `//! The streaming pool: which cells stay resident.
pub struct CellPool {
    resident: Vec<ResidentCell>,
    budget_bytes: u64,
}

const TURN_TICKS: u32 = 2_400;

impl CellPool {
    /// Lower scores go first. Cells the tide exposes within one turn are kept.
    pub fn evict_score(&self, cell: &ResidentCell, forecast: &TideForecast) -> i64 {
        if forecast.exposes_within(cell.id, TURN_TICKS) {
            return i64::MAX;
        }
        -(cell.distance_to_nearest_player as i64)
    }

    pub fn evict(&mut self, forecast: &TideForecast) -> Option<CellId> {
        let cell = self.resident.iter().min_by_key(|c| self.evict_score(c, forecast))?;
        Some(cell.id)
    }
}
`;

const TIDES_MOD_1 = `//! The tide simulation. Steps at 10 Hz; every peer computes the same bits.
pub mod fixed;
pub mod phase;
mod sine_table;
`;

const TIDES_MOD_LOD = `//! The tide simulation. Steps at 10 Hz; every peer computes the same bits.
pub mod fixed;
pub mod lod;
pub mod phase;
mod sine_table;
`;

const FIXED = `//! 32.32 fixed-point arithmetic for the tide simulation.
#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Fixed32x32(pub i64);

impl Fixed32x32 {
    pub const ONE: Self = Self(1 << 32);

    pub fn mul(self, other: Self) -> Self {
        Self(((self.0 as i128 * other.0 as i128) >> 32) as i64)
    }

    pub fn sin(self) -> Self {
        super::sine_table::lookup(self)
    }
}

/// One tide step over the preallocated height field.
pub fn step_tide(heights: &mut HeightField, phase: Fixed32x32) {
    for cell in heights.cells_mut() {
        cell.height = cell.amplitude.mul(phase.sin());
    }
}
`;

const SINE_TABLE = `//! Generated at build time by tools/gen_sine_table.py. Do not edit.
pub const ENTRIES: usize = 4096;

pub static TABLE: [i64; ENTRIES] = include!("sine_table.in");

pub fn lookup(angle: super::fixed::Fixed32x32) -> super::fixed::Fixed32x32 {
    super::fixed::Fixed32x32(interpolate(&TABLE, angle.0))
}
`;

const PHASE_1 = `//! The tide phase, as a fraction of the 40-minute cycle.
use super::fixed::Fixed32x32;

pub struct TidePhase {
    pub main: Fixed32x32,
}

/// Wraps the accumulator at each cycle so it never holds more than one.
pub fn wrap_phase(phase: Fixed32x32) -> Fixed32x32 {
    Fixed32x32(phase.0 & (Fixed32x32::ONE.0 - 1))
}
`;

const PHASE_2 = `//! The tide phase, as a fraction of the 40-minute cycle.
use super::fixed::Fixed32x32;

pub struct TidePhase {
    pub main: Fixed32x32,
    /// Second harmonic, seven cycles long: spring and neap tides.
    pub harmonic: Fixed32x32,
}

/// Wraps the accumulator at each cycle so it never holds more than one.
pub fn wrap_phase(phase: Fixed32x32) -> Fixed32x32 {
    Fixed32x32(phase.0 & (Fixed32x32::ONE.0 - 1))
}

pub fn harmonic_phase(main_cycles: u64, phase: Fixed32x32) -> Fixed32x32 {
    wrap_phase(Fixed32x32(((main_cycles % 7) as i64 * Fixed32x32::ONE.0 + phase.0) / 7))
}
`;

const VB_1 = `//! Material resolve from the visibility buffer.
/// Foliage and saltglass still draw in the forward pass.
pub const FORWARD_PASSES: &[MaterialClass] = &[MaterialClass::Foliage, MaterialClass::Saltglass];

pub fn resolve_materials(vb: &VisibilityBuffer, tables: &MaterialTables, out: &mut GBufferLite) {
    for tile in vb.tiles() {
        out.write(tile, tables.shade(vb.triangle(tile)));
    }
}
`;

const VB_2 = `//! Material resolve from the visibility buffer, on every platform.
/// Saltglass still draws in the forward pass.
pub const FORWARD_PASSES: &[MaterialClass] = &[MaterialClass::Saltglass];

/// Skiff resolves materials every other frame and reuses the last result.
pub const SKIFF_HALF_RATE: bool = true;

pub fn resolve_materials(vb: &VisibilityBuffer, tables: &MaterialTables, out: &mut GBufferLite, frame: u64) {
    if cfg!(target_platform = "skiff") && SKIFF_HALF_RATE && frame % 2 == 1 {
        return;
    }
    for tile in vb.tiles() {
        out.write(tile, tables.shade(vb.triangle(tile)));
    }
}
`;

const PSO_CACHE = `//! The on-device pipeline cache for Skiff. Players' machines compile each
//! pipeline once and keep it in the save partition.
pub struct PipelineCache {
    file: CacheFile,
    driver_version: u32,
}

impl PipelineCache {
    pub fn get_or_compile(&mut self, desc: &PipelineDesc) -> Pipeline {
        let key = (desc.hash(), self.driver_version);
        self.file.get(key).unwrap_or_else(|| self.compile_and_store(desc, key))
    }

    /// Compiles every pipeline on a district's list while a load screen is up.
    pub fn warm_district(&mut self, district: &DistrictPipelines) {
        for desc in district.pipelines() {
            self.get_or_compile(desc);
        }
    }
}
`;

const VSM_POOL_1 = `//! The virtual shadow map page pool for sun shadows.
pub const PAGE_TEXELS: u32 = 128;
pub const POOL_PAGES: usize = 4096;

pub struct PagePool {
    pages: Vec<Page>,
    moving: Vec<PageId>,
}

impl PagePool {
    /// Frees pages for this frame's requests. Static pages go oldest-sampled
    /// first; pages in the moving-object set are never evicted.
    pub fn evict_pages(&mut self, needed: usize) -> usize {
        let mut freed = 0;
        let mut candidates: Vec<_> = self.pages.iter().filter(|p| !p.moving).collect();
        candidates.sort_by_key(|p| p.last_sampled);
        for page in candidates.into_iter().take(needed) {
            self.release(page.id);
            freed += 1;
        }
        freed
    }
}
`;

const VSM_POOL_GROW = `//! The virtual shadow map page pool for sun shadows.
pub const PAGE_TEXELS: u32 = 128;
pub const POOL_PAGES: usize = 4096;
/// Pool size near spring low water, paid for by the far GI cascade.
pub const SPRING_LOW_POOL_PAGES: usize = 6144;

pub struct PagePool {
    pages: Vec<Page>,
    moving: Vec<PageId>,
    capacity: usize,
}

impl PagePool {
    /// Frees pages for this frame's requests. Static pages go oldest-sampled
    /// first; pages in the moving-object set are never evicted.
    pub fn evict_pages(&mut self, needed: usize) -> usize {
        let mut freed = 0;
        let mut candidates: Vec<_> = self.pages.iter().filter(|p| !p.moving).collect();
        candidates.sort_by_key(|p| p.last_sampled);
        for page in candidates.into_iter().take(needed) {
            self.release(page.id);
            freed += 1;
        }
        freed
    }

    /// Grows the pool before spring low water and shrinks it after mid flood.
    pub fn grow_for_tide(&mut self, forecast: &TideForecast, gi: &mut SdfVolumes) {
        if forecast.spring_low_within_one_step() && self.capacity == POOL_PAGES {
            gi.lend_far_cascade();
            self.capacity = SPRING_LOW_POOL_PAGES;
        } else if forecast.past_mid_flood() && self.capacity == SPRING_LOW_POOL_PAGES {
            self.capacity = POOL_PAGES;
            gi.reclaim_far_cascade();
        }
    }
}
`;

const VSM_POOL_COARSE = `//! The virtual shadow map page pool for sun shadows.
pub const PAGE_TEXELS: u32 = 128;
pub const POOL_PAGES: usize = 4096;
/// Exposed wet sand gets pages one mip level coarser.
pub const WET_SAND_PAGE_LEVEL_BIAS: u32 = 1;

pub struct PagePool {
    pages: Vec<Page>,
    moving: Vec<PageId>,
}

impl PagePool {
    /// Frees pages for this frame's requests. Fine pages on exposed wet sand
    /// go first, then static pages oldest-sampled first; pages in the
    /// moving-object set are never evicted.
    pub fn evict_pages(&mut self, needed: usize) -> usize {
        let mut freed = 0;
        let mut candidates: Vec<_> = self.pages.iter().filter(|p| !p.moving).collect();
        candidates.sort_by_key(|p| (!p.on_wet_sand, p.last_sampled));
        for page in candidates.into_iter().take(needed) {
            self.release(page.id);
            freed += 1;
        }
        freed
    }

    pub fn page_level(&self, tile: &ShadowTile) -> u32 {
        tile.level + if tile.on_wet_sand { WET_SAND_PAGE_LEVEL_BIAS } else { 0 }
    }
}
`;

const SDF_VOLUMES_LEND = `//! Signed-distance-field volumes for global illumination.
pub const CASCADES: usize = 4;

pub struct SdfVolumes {
    cascades: [Cascade; CASCADES],
    far_lent: bool,
}

impl SdfVolumes {
    pub fn update(&mut self, camera: &Camera) {
        let live = if self.far_lent { CASCADES - 1 } else { CASCADES };
        for cascade in &mut self.cascades[..live] {
            cascade.recenter(camera.position);
        }
    }

    /// Stops updating the far cascade and hands its 128 MB to the shadow pool.
    pub fn lend_far_cascade(&mut self) {
        self.far_lent = true;
    }

    pub fn reclaim_far_cascade(&mut self) {
        self.far_lent = false;
    }
}
`;

const PRESETS_1 = `//! Tern quality presets.
pub enum TernPreset {
    Quality,
    Balanced,
    Performance,
}

impl TernPreset {
    pub fn input_scale(self) -> f32 {
        match self {
            TernPreset::Quality => 0.67,
            TernPreset::Balanced => 0.58,
            TernPreset::Performance => 0.5,
        }
    }
}
`;

const PRESETS_2 = `//! Tern quality presets.
pub enum TernPreset {
    Quality,
    Balanced,
    Performance,
    /// For the Meridian 120 Hz performance mode.
    UltraPerformance,
}

impl TernPreset {
    pub fn input_scale(self) -> f32 {
        match self {
            TernPreset::Quality => 0.67,
            TernPreset::Balanced => 0.58,
            TernPreset::Performance => 0.5,
            TernPreset::UltraPerformance => 0.33,
        }
    }
}
`;

const REMOTE = `"""Remote execution for shader cache misses."""
MAX_JOBS_PER_AGENT = 6
FETCH_TIMEOUT_S = 30


def fan_out_misses(misses, agents):
    """Sends each cache miss to the least busy farm agent."""
    for miss in misses:
        agent = min(agents, key=lambda a: a.running)
        if agent.running < MAX_JOBS_PER_AGENT:
            agent.submit(miss)


def fetch(entry, store):
    try:
        return store.get(entry, timeout=FETCH_TIMEOUT_S)
    except TimeoutError:
        return store.get(entry, timeout=FETCH_TIMEOUT_S)
`;

const UPGRADE_1 = `//! Save upgrades: one step per schema version, run in order on load.
pub const SAVE_SCHEMA_VERSION: u32 = 1;

type Step = fn(SaveBlob) -> SaveBlob;

/// Step i upgrades a save from version i to i + 1. Never edit a shipped step.
pub fn upgrade_steps() -> &'static [Step] {
    &[stamp_version]
}

fn stamp_version(save: SaveBlob) -> SaveBlob {
    save.with_header_version(1)
}

pub fn upgrade(mut save: SaveBlob) -> SaveBlob {
    for step in &upgrade_steps()[save.version() as usize..] {
        save = step(save);
    }
    save
}
`;

const HOST_SYNC = `//! Host-authoritative co-op sync. The host runs the only tide simulation;
//! clients send inputs and predict their own player.
pub struct HostSync {
    peers: Vec<PeerId>,
}

impl HostSync {
    pub fn send_snapshot(&mut self, world: &WorldState) {
        for peer in &self.peers {
            self.transport.send(*peer, world.snapshot_for(*peer));
        }
    }
}
`;

const CHECKSUM = `//! Desync detection: hash tide, physics and Gull state separately.
pub const HASH_INTERVAL_FRAMES: u64 = 30;

pub fn hash_blocks(frame: u64, world: &WorldState) -> Option<[u32; 3]> {
    if frame % HASH_INTERVAL_FRAMES != 0 {
        return None;
    }
    Some([crc32(world.tide()), crc32(world.physics()), crc32(world.gull())])
}
`;

const HISTORY = `//! Tern's history buffer.
/// Where saltglass sets the reactive mask, trust the current frame.
pub fn apply_reactive_mask(history: &mut HistoryBuffer, mask: &ReactiveMask) {
    for (texel, reactive) in history.texels_mut().zip(mask.values()) {
        if *reactive > 0 {
            texel.weight = 0.0;
        }
    }
}

pub fn clamp_history(history: &mut HistoryBuffer, current: &Frame) {
    for (texel, neighborhood) in history.texels_mut().zip(current.neighborhoods()) {
        if texel.weight > 0.0 {
            texel.color = neighborhood.clamp(texel.color);
        }
    }
}
`;

const DYNRES = `//! Dynamic resolution on Skiff. Tern upscales to 720p.
pub const FLOOR_LINES: u32 = 504;
pub const CEILING_LINES: u32 = 720;
pub const HOLD_FRAMES: u32 = 60;

pub fn next_lines(current: u32, gpu_ms: f32, budget_ms: f32, held: u32) -> u32 {
    if gpu_ms > budget_ms {
        return FLOOR_LINES;
    }
    if held < HOLD_FRAMES {
        return current;
    }
    (current + 24).min(CEILING_LINES)
}
`;

const STORM_1 = `//! Tide-storm particles.
pub const STORM_PARTICLES: u32 = 14_000;

pub fn storm_particle_budget(_platform: Platform) -> u32 {
    STORM_PARTICLES
}
`;

const STORM_CAP = `//! Tide-storm particles.
pub const STORM_PARTICLES: u32 = 14_000;
pub const STORM_PARTICLES_SKIFF: u32 = 6_000;
/// Skiff skips tide collision for particles farther than this.
pub const TIDE_COLLISION_RANGE_M: f32 = 40.0;

pub fn storm_particle_budget(platform: Platform) -> u32 {
    match platform {
        Platform::Skiff => STORM_PARTICLES_SKIFF,
        _ => STORM_PARTICLES,
    }
}
`;

const BRINE_1 = `//! The Brine tonemapping curve.
/// Where the HDR shoulder starts, in nits.
pub const HDR_SHOULDER_NITS: f32 = 1000.0;

pub fn brine_curve(x: f32, peak_nits: f32) -> f32 {
    let toe = x * x / (x + 0.18);
    shoulder(toe, HDR_SHOULDER_NITS.min(peak_nits), peak_nits)
}
`;

// The code lags behind the Decision in force (render.dec-brine-3, 800 nits).
const BRINE_2 = `//! The Brine tonemapping curve.
/// Where the HDR shoulder starts, in nits.
pub const HDR_SHOULDER_NITS: f32 = 1000.0;

pub fn brine_curve(x: f32, peak_nits: f32) -> f32 {
    // Negative scene values come from the bloom pass; they would bend the toe.
    let x = x.max(0.0);
    let toe = x * x / (x + 0.18);
    shoulder(toe, HDR_SHOULDER_NITS.min(peak_nits), peak_nits)
}
`;

const LOD_QUARTER = `//! Tide level of detail: cells far from every player step less often.
use super::fixed::Fixed32x32;

pub const FAR_CELL_M: u32 = 600;
pub const FAR_STEP_DIVISOR: u64 = 4;

/// Far cells step on every fourth tick, four ticks of phase at a time.
/// Every peer picks the same cells, so tide state stays bit-identical.
pub fn step_far_cells(heights: &mut HeightField, tick: u64, phase: Fixed32x32) {
    if tick % FAR_STEP_DIVISOR != 0 {
        return;
    }
    for cell in heights.cells_beyond_mut(FAR_CELL_M) {
        cell.height = cell.amplitude.mul(phase.sin());
    }
}
`;

const LOD_FREEZE = `//! Tide level of detail: cells far from every player stop stepping.
use super::fixed::Fixed32x32;

pub const FAR_CELL_M: u32 = 600;

/// Far cells keep the tick they froze at.
pub fn freeze_far_cells(heights: &mut HeightField, tick: u64) {
    for cell in heights.cells_beyond_mut(FAR_CELL_M) {
        cell.frozen_at.get_or_insert(tick);
    }
}

/// Runs a cell's missed ticks in one batch when a player comes within range.
pub fn catch_up(cell: &mut TideCell, tick: u64, phase_at: impl Fn(u64) -> Fixed32x32) {
    if let Some(from) = cell.frozen_at.take() {
        cell.height = cell.amplitude.mul(phase_at(tick).sin());
        cell.missed_ticks = tick - from;
    }
}
`;

const FLATBREAD_CONFIG = `import { source as filesystem } from '@flatbread/source-filesystem';
import { transformer as markdownTransformer } from '@flatbread/transformer-markdown';
import { defineConfig } from '@flatbread/config';
import { proofContent } from '@flatbread/proof';

export default defineConfig({
  source: filesystem(),
  transformer: markdownTransformer(),
  content: proofContent(),
});
`;

// ------------------------------------------------------------- history ----

const main = [
  {
    key: 'm01',
    at: at('2025-09-02 10:00'),
    author: 'rhea',
    subject: 'Lay out the engine, platform and tools source tree',
    files: FILES_M01,
  },
  {
    key: 'm02',
    at: at('2025-09-24 16:00'),
    author: 'liam',
    subject: 'Key the shader cache on source text and compiler version',
    proof: ['tools.dec-key-v1'],
    files: {
      'tools/shadercache/__init__.py':
        '"""The build farm\'s shader compile cache."""\n',
      'tools/shadercache/key.py': KEY_V1,
      'tools/shadercache/README.md': `# Shader compile cache

A content-addressed cache of compiled shaders, shared by every farm agent.
\`key.py\` builds the cache key; \`remote.py\` sends misses to other agents.
`,
    },
  },
  {
    key: 'm03',
    at: at('2025-10-01 11:00'),
    author: 'kenji',
    subject: 'Read streamed assets through one request queue per platform',
    proof: ['world.dec-io-queue'],
    files: { 'engine/kestrel/streaming/io_queue.rs': IO_QUEUE_1 },
  },
  {
    key: 'm04',
    at: at('2025-10-17 15:00'),
    author: 'liam',
    subject: 'Hash preprocessed source, defines and target in the cache key',
    body: 'Included headers were not part of the key, so a header change could serve a stale shader.',
    proof: ['tools.dec-key-v2'],
    files: { 'tools/shadercache/key.py': KEY_V2 },
  },
  {
    key: 'm05',
    at: at('2025-10-28 14:00'),
    author: 'kenji',
    subject: 'Evict streaming cells least recently used',
    proof: ['world.dec-pool-lru'],
    files: { 'engine/kestrel/streaming/pool.rs': POOL_1 },
  },
  {
    key: 'm06',
    at: at('2025-11-03 12:00'),
    author: 'rhea',
    subject: 'Run the tide simulation in 32.32 fixed point',
    proof: ['world.dec-tide-fixed'],
    files: {
      'engine/kestrel/tides/mod.rs': TIDES_MOD_1,
      'engine/kestrel/tides/fixed.rs': FIXED,
      'engine/kestrel/tides/sine_table.rs': SINE_TABLE,
    },
  },
  {
    key: 'm07',
    at: at('2025-11-13 11:00'),
    author: 'rhea',
    subject: 'Wrap the tide phase at each 40-minute cycle',
    proof: ['world.dec-tide-wrap'],
    files: { 'engine/kestrel/tides/phase.rs': PHASE_1 },
  },
  {
    key: 'm08',
    at: at('2025-11-15 17:00'),
    author: 'tomasz',
    subject: 'Resolve opaque materials from the visibility buffer',
    proof: ['render.dec-vb-3'],
    files: { 'engine/lantern/vb/resolve.rs': VB_1 },
  },
  {
    key: 'm09',
    at: at('2025-12-13 15:00'),
    author: 'priya',
    subject: 'Keep compiled pipelines in an on-device cache on Skiff',
    proof: ['ports.dec-pso-ondevice'],
    files: { 'platform/skiff/pso_cache.rs': PSO_CACHE },
  },
  {
    key: 'm10',
    at: at('2026-01-13 16:00'),
    author: 'kenji',
    subject: 'Evict streaming cells by distance and tide forecast',
    proof: ['world.dec-pool-forecast'],
    files: { 'engine/kestrel/streaming/pool.rs': POOL_2 },
  },
  {
    key: 'm11',
    at: at('2026-01-16 10:00'),
    author: 'liam',
    subject: 'Hash the compiler binary instead of its version string',
    body: 'Also normalize compile flags, so flag order no longer changes the key. The first build after this runs cold.',
    files: { 'tools/shadercache/key.py': KEY_V3 },
  },
  {
    key: 'm12',
    at: at('2026-02-18 15:00'),
    author: 'tomasz',
    subject: 'Add the virtual shadow map page pool',
    proof: ['render.dec-vsm'],
    files: { 'engine/lantern/shadows/vsm_pool.rs': VSM_POOL_1 },
  },
  {
    key: 'm13',
    at: at('2026-02-26 11:00'),
    author: 'ines',
    subject: 'Ship three Tern quality presets',
    proof: ['render.dec-presets-3'],
    files: { 'engine/lantern/tern/presets.rs': PRESETS_1 },
  },
  {
    key: 'm14',
    at: at('2026-02-27 14:00'),
    author: 'liam',
    subject: 'Fan cache misses out to farm agents, six jobs per agent',
    proof: ['tools.dec-remote', 'tools.dec-cap-jobs'],
    files: { 'tools/shadercache/remote.py': REMOTE },
  },
  {
    key: 'm15',
    at: at('2026-03-13 10:00'),
    author: 'marta',
    subject: 'Stamp saves with a schema version and upgrade them on load',
    proof: ['world.dec-save-version'],
    files: { 'engine/kestrel/save/upgrade.rs': UPGRADE_1 },
  },
  {
    key: 'm16',
    at: at('2026-04-03 16:00'),
    author: 'sofia',
    subject: 'Sync co-op from the host and hash state blocks every 30 frames',
    proof: ['netcode.dec-host', 'netcode.dec-checksum'],
    files: {
      'net/coop/host_sync.rs': HOST_SYNC,
      'net/coop/checksum.rs': CHECKSUM,
    },
  },
  {
    key: 'm17',
    at: at('2026-05-07 12:00'),
    author: 'ines',
    subject: 'Give the Brine curve a separate HDR shoulder',
    proof: ['render.dec-brine-2'],
    files: { 'engine/lantern/tonemap/brine.rs': BRINE_1 },
  },
  {
    key: 'm18',
    at: at('2026-05-12 13:00'),
    author: 'kenji',
    subject: 'Put reads for tide-exposed cells at the head of the queue',
    proof: ['world.dec-io-tide-priority'],
    files: { 'engine/kestrel/streaming/io_queue.rs': IO_QUEUE_2 },
  },
  {
    key: 'm19',
    at: at('2026-05-19 15:00'),
    author: 'ines',
    subject: 'Feed the saltglass reactive mask into Tern',
    proof: ['render.dec-tern-reactive'],
    files: { 'engine/lantern/tern/history.rs': HISTORY },
  },
  {
    key: 'm20',
    at: at('2026-06-11 10:00'),
    author: 'ines',
    subject: 'Add the Ultra Performance Tern preset',
    proof: ['render.dec-presets-4b'],
    files: { 'engine/lantern/tern/presets.rs': PRESETS_2 },
  },
  {
    key: 'm21',
    at: at('2026-07-07 11:00'),
    author: 'rhea',
    subject: 'Add the second tide harmonic',
    proof: ['world.dec-tide-harmonic'],
    files: { 'engine/kestrel/tides/phase.rs': PHASE_2 },
  },
  {
    key: 'm22',
    at: at('2026-07-09 16:00'),
    author: 'tomasz',
    subject: 'Resolve Skiff materials at half rate and bring foliage back',
    files: { 'engine/lantern/vb/resolve.rs': VB_2 },
  },
  {
    key: 'm23',
    at: at('2026-07-23 10:00'),
    author: 'priya',
    subject: 'Lower the Skiff dynamic resolution floor to 504p',
    proof: ['ports.dec-dynres-3'],
    files: { 'platform/skiff/dynres.rs': DYNRES },
  },
  {
    key: 'm24',
    at: at('2026-08-12 15:00'),
    author: 'priya',
    subject: 'Add a per-platform tide-storm particle budget',
    files: {
      'platform/skiff/storm.rs': STORM_1,
      'platform/skiff/frame_modes.rs': `//! Display modes on Skiff.
pub enum FrameMode {
    Hz30,
    /// 25 ms per frame.
    Hz40,
}
`,
    },
  },
  {
    key: 'm25',
    at: at('2026-09-09 12:00'),
    author: 'ines',
    subject: 'Clamp negative scene values before the Brine curve',
    files: { 'engine/lantern/tonemap/brine.rs': BRINE_2 },
  },
  {
    key: 'm26',
    at: at('2026-09-26 10:00'),
    author: 'dara',
    subject: 'Move the Proof graph into the engine repository',
    body: 'Project memory used to live in its own repository. Keeping it here lets commits and records name each other.',
    graph: true,
    files: { 'README.md': README_2, 'flatbread.config.js': FLATBREAD_CONFIG },
  },
  {
    key: 'm27',
    at: at('2026-09-28 10:00'),
    author: 'rhea',
    subject: 'Anchor Proof records to the code that implements them',
    events: [
      {
        type: 'Anchor',
        effort: 'render',
        key: 'cit-code-vsm-evict',
        title: 'Code: VSM page pool eviction',
        path: 'engine/lantern/shadows/vsm_pool.rs',
        symbol: 'evict_pages',
        commit: 'm12',
        created_by: 'Tomasz Brandt',
      },
      {
        type: 'WriteFinding',
        effort: 'render',
        key: 'fnd-impl-vsm-evict',
        kind: 'implementation',
        title:
          'Sun shadow pages are evicted oldest-sampled first, never from the moving set',
        created_by: 'Tomasz Brandt',
        derives_from: ['render.dec-vsm'],
        cites: ['render.cit-code-vsm-evict'],
        body:
          'The page pool frees pages when a frame asks for more than the 4,096-page pool has free. Static pages go in the order they were last sampled, oldest first. ' +
          'Pages in the moving-object set are never evicted, since they are redrawn every frame anyway. When no static page is left to drop, the tile falls back to the coarse distance-field shadow. ' +
          'This is the path that runs dry on the flats at spring low tide.',
      },
      {
        type: 'Anchor',
        effort: 'render',
        key: 'cit-code-tern-reactive',
        title: 'Code: Tern reactive mask',
        path: 'engine/lantern/tern/history.rs',
        symbol: 'apply_reactive_mask',
        commit: 'm19',
        created_by: 'Ines Okafor',
      },
      {
        type: 'WriteFinding',
        effort: 'render',
        key: 'fnd-impl-tern-reactive',
        kind: 'implementation',
        title:
          'Tern zeroes history weight wherever saltglass sets the reactive mask',
        created_by: 'Ines Okafor',
        derives_from: ['render.dec-tern-reactive'],
        cites: ['render.cit-code-tern-reactive'],
        body:
          'Saltglass writes the reactive mask each frame. Tern sets the history weight to zero under it, so those pixels take the current frame, and the history clamp skips them. ' +
          'Caustics do not write the mask. That is why this code does nothing for the caustic flicker blocker.',
      },
      {
        type: 'Anchor',
        effort: 'world',
        key: 'cit-code-pool-score',
        title: 'Code: streaming pool eviction score',
        path: 'engine/kestrel/streaming/pool.rs',
        symbol: 'evict_score',
        commit: 'm10',
        created_by: 'Kenji Arakawa',
      },
      {
        type: 'WriteFinding',
        effort: 'world',
        key: 'fnd-impl-pool-score',
        kind: 'implementation',
        title: 'Pool eviction keeps cells the tide exposes within half a turn',
        created_by: 'Kenji Arakawa',
        derives_from: ['world.dec-pool-forecast'],
        cites: ['world.cit-code-pool-score'],
        body:
          'The eviction score is the negative distance from the nearest player, so the farthest cell goes first. Cells the tide forecast exposes soon are never evicted. ' +
          'The Decision says within one tide turn; the code protects only half a turn, because the forecast lookup was written before the turn length was fixed. Nobody has seen a problem from it yet.',
      },
      {
        type: 'WriteRisk',
        effort: 'world',
        key: 'rsk-pool-score-cost',
        likelihood: 'medium',
        severity: 'low',
        title:
          'Eviction scoring asks the tide forecast about every resident cell each frame',
        created_by: 'Kenji Arakawa',
        derives_from: ['world.dec-pool-forecast'],
        cites: ['world.cit-code-pool-score'],
        body:
          'Scoring makes one forecast lookup per resident cell per frame, about 180 lookups. On Skiff that is 0.2 ms of the main thread. ' +
          'If the pool grows, or the forecast needs a second lookup per cell for the second harmonic, it could double.',
      },
      {
        type: 'Anchor',
        effort: 'world',
        key: 'cit-code-tide-push',
        title: 'Code: tide reads in the request queue',
        path: 'engine/kestrel/streaming/io_queue.rs',
        symbol: 'push_tide_read',
        commit: 'm18',
        created_by: 'Kenji Arakawa',
      },
      {
        type: 'WriteFinding',
        effort: 'world',
        key: 'fnd-impl-tide-push',
        kind: 'implementation',
        title:
          'Tide-exposed cell reads go to the front of the platform read queue',
        created_by: 'Kenji Arakawa',
        derives_from: ['world.dec-io-tide-priority'],
        cites: ['world.cit-code-tide-push'],
        body:
          'Reads for cells the tide is about to expose are pushed onto the front of their own lane, and that lane is served before proximity and background reads. ' +
          'It is the only place the tide outranks the player; every other read keeps its fixed priority.',
      },
      {
        type: 'Anchor',
        effort: 'world',
        key: 'cit-code-save-upgrade',
        title: 'Code: save upgrade steps',
        path: 'engine/kestrel/save/upgrade.rs',
        symbol: 'upgrade_steps',
        commit: 'm15',
        created_by: 'Marta Lindqvist',
      },
      {
        type: 'WriteFinding',
        effort: 'world',
        key: 'fnd-impl-save-upgrade',
        kind: 'implementation',
        title:
          'Save upgrades run every step from the save version on load, one function per version',
        created_by: 'Marta Lindqvist',
        derives_from: ['world.dec-save-version', 'world.con-save-compat'],
        cites: ['world.cit-code-save-upgrade'],
        body:
          'There is one step function per schema version, and loading runs every step from the save version up to the current one before deltas apply. ' +
          'Steps are plain functions of the old save. There is one step today, the version 1 stamp. The second harmonic phase has no step yet.',
      },
      {
        type: 'Anchor',
        effort: 'world',
        key: 'cit-code-tide-wrap',
        title: 'Code: tide phase wrap',
        path: 'engine/kestrel/tides/phase.rs',
        symbol: 'wrap_phase',
        commit: 'm07',
        created_by: 'Rhea Valdés',
      },
      {
        type: 'WriteFinding',
        effort: 'world',
        key: 'fnd-impl-tide-wrap',
        kind: 'implementation',
        title: 'The tide phase is masked to one cycle on every step',
        created_by: 'Rhea Valdés',
        derives_from: ['world.dec-tide-wrap'],
        cites: ['world.cit-code-tide-wrap'],
        body: 'The phase is a 32.32 fraction of the cycle and is masked to its fraction bits on every step, so it can never hold more than one 40-minute cycle.',
      },
      {
        type: 'WriteConstraint',
        effort: 'world',
        key: 'con-tide-step-alloc',
        kind: 'hard',
        title: 'The tide step allocates no memory',
        created_by: 'Rhea Valdés',
        derives_from: ['world.dec-tide-fixed'],
        body:
          'The fixed-point tide step in engine/kestrel/tides/fixed.rs must not allocate. It runs at 10 Hz on every peer, and one allocation in it showed up as 0.3 ms spikes on Skiff. ' +
          'Use the preallocated height field and the checked-in sine table.',
      },
      {
        type: 'WriteIssue',
        effort: 'world',
        key: 'iss-tide-lod-q',
        kind: 'question',
        title:
          'How should the tide simulation save time in cells far from every player?',
        created_by: 'Rhea Valdés',
        derives_from: ['world.rsk-tide-skiff-cost'],
        body:
          'The fixed-point tide step costs 0.9 ms on Skiff, and most of it goes to cells no player is near. ' +
          'We want a cheaper step for cells more than 600 m from every player. It must keep peers bit-identical and leave far cells in the right state when a player arrives.',
      },
      {
        type: 'WriteDecision',
        effort: 'world',
        key: 'dec-tide-lod-quarter',
        title: 'Step tide cells beyond 600 m at a quarter of the tide rate',
        created_by: 'Kenji Arakawa',
        derives_from: ['world.iss-tide-lod-q', 'world.con-tide-bitexact'],
        body:
          'Cells more than 600 m from every player step on every fourth tide tick, taking four ticks of phase at once. Every peer picks the same cells from the same player positions, so tide state stays bit-identical. ' +
          'Kenji Arakawa estimates the Skiff tide step drops from 0.9 ms to 0.4 ms on the coast map.',
      },
      {
        type: 'Anchor',
        effort: 'ports',
        key: 'cit-code-pso-warm',
        title: 'Code: pipeline cache warm-up',
        path: 'platform/skiff/pso_cache.rs',
        symbol: 'warm_district',
        commit: 'm09',
        created_by: 'Priya Natarajan',
      },
      {
        type: 'WriteFinding',
        effort: 'ports',
        key: 'fnd-impl-pso-warm',
        kind: 'implementation',
        title:
          'Load screens compile each district pipeline list into the on-device cache',
        created_by: 'Priya Natarajan',
        derives_from: ['ports.dec-pso-ondevice'],
        cites: ['ports.cit-code-pso-warm'],
        body:
          'While a load screen is up, the game walks the district list and compiles every pipeline that is not cached yet. ' +
          'Entries are keyed by pipeline hash and driver version, so a driver change misses every entry and the lists rebuild the cache.',
      },
      {
        type: 'WriteIssue',
        effort: 'ports',
        key: 'iss-dynres-hold',
        kind: 'defect',
        title:
          'Skiff stays at the lowest resolution for two seconds after one slow frame',
        created_by: 'Yusuf Demir',
        derives_from: ['ports.dec-dynres-3'],
        body:
          'platform/skiff/dynres.rs drops straight to the 504p floor when one frame misses the GPU budget, then holds there for 60 frames before stepping back up. ' +
          'A single spike from a tide splash leaves the picture soft for two seconds. Yusuf Demir wants a gradual step down as well as up.',
      },
      {
        type: 'Anchor',
        effort: 'tools',
        key: 'cit-code-cache-key',
        title: 'Code: shader cache key',
        path: 'tools/shadercache/key.py',
        symbol: 'cache_key',
        commit: 'm11',
        created_by: "Liam O'Connell",
      },
      {
        type: 'WriteFinding',
        effort: 'tools',
        key: 'fnd-impl-cache-key',
        kind: 'implementation',
        title:
          'The cache key hashes its inputs in the order the key Decision lists them',
        created_by: "Liam O'Connell",
        derives_from: ['tools.dec-key-v3'],
        cites: ['tools.cit-code-cache-key'],
        body:
          'The key hashes the preprocessed source, the sorted defines, the target, the compiler binary hash and the normalized flags, in that order. ' +
          'The compiler binary hash is computed once per agent at startup.',
      },
      {
        type: 'WriteIssue',
        effort: 'tools',
        key: 'iss-remote-retry',
        kind: 'defect',
        title:
          'A timed-out cache fetch is retried once and then compiled locally',
        created_by: "Liam O'Connell",
        derives_from: ['tools.dec-timeout'],
        body:
          'tools/shadercache/remote.py retries a fetch that times out exactly once, with the same 30-second timeout, and then the agent compiles the shader itself. ' +
          'At the 02:00 network peak that turns one slow fetch into a minute of waiting followed by a local compile.',
      },
      {
        type: 'Anchor',
        effort: 'netcode',
        key: 'cit-code-checksum',
        title: 'Code: desync checksums',
        path: 'net/coop/checksum.rs',
        symbol: 'hash_blocks',
        commit: 'm16',
        created_by: 'Sofia Marchetti',
      },
      {
        type: 'WriteFinding',
        effort: 'netcode',
        key: 'fnd-impl-checksum',
        kind: 'implementation',
        title: 'Desync checks hash three state blocks every 30th frame',
        created_by: 'Sofia Marchetti',
        derives_from: ['netcode.dec-checksum'],
        cites: ['netcode.cit-code-checksum'],
        body: 'Tide, physics and Gull state are hashed separately with CRC-32 on every 30th frame. The host keeps sending them after the switch to host-authoritative sync.',
      },
    ],
  },
  {
    key: 'm28',
    at: at('2026-09-29 09:00'),
    author: 'kenji',
    subject: 'Keep cells the tide exposes within one turn, not half a turn',
    proof: ['world.dec-pool-forecast'],
    files: { 'engine/kestrel/streaming/pool.rs': POOL_3 },
  },
  {
    key: 'm29',
    at: at('2026-09-29 10:00'),
    author: 'kenji',
    subject: 'Record the pool eviction fix in Proof',
    events: [
      {
        type: 'Anchor',
        effort: 'world',
        key: 'cit-code-pool-score-2',
        title: 'Code: streaming pool eviction score, one-turn fix',
        path: 'engine/kestrel/streaming/pool.rs',
        symbol: 'evict_score',
        commit: 'm28',
        created_by: 'Kenji Arakawa',
      },
      {
        type: 'WriteFinding',
        effort: 'world',
        key: 'fnd-impl-pool-score-2',
        kind: 'implementation',
        title:
          'Pool eviction keeps cells the tide exposes within one full turn',
        created_by: 'Kenji Arakawa',
        supersedes: ['world.fnd-impl-pool-score'],
        derives_from: ['world.dec-pool-forecast'],
        cites: ['world.cit-code-pool-score-2'],
        body:
          'The eviction score now protects cells the forecast exposes within one full tide turn, 2,400 ticks, as the Decision says. ' +
          'The half-turn window let the pool evict cells about 12 minutes before the tide uncovered them on the coast map.',
      },
    ],
  },
];

// ------------------------------------------------------------ branches ----

const branches = [
  {
    name: 'ines/vsm-pool',
    pr: 41,
    author: 'ines',
    title: 'Grow the shadow page pool at spring low tide',
    commits: [
      {
        key: 'b1a',
        at: at('2026-09-29 14:00'),
        author: 'ines',
        subject: 'Grow the VSM page pool to 6,144 pages near spring low water',
        body: 'The far GI cascade lends its 128 MB while the sun is low over the flats.',
        proof: ['render.dec-vsm-grow'],
        files: {
          'engine/lantern/shadows/vsm_pool.rs': VSM_POOL_GROW,
          'engine/lantern/gi/sdf_volumes.rs': SDF_VOLUMES_LEND,
        },
        events: [
          {
            type: 'WriteDecision',
            effort: 'render',
            key: 'dec-vsm-grow',
            title:
              'Use virtual shadow maps for the sun with a 6,144-page pool at spring low tide',
            created_by: 'Ines Okafor',
            supersedes: ['render.dec-vsm'],
            derives_from: [
              'render.fnd-vsm-overflow',
              'render.iss-vsm-tide',
              'render.con-vram',
            ],
            body:
              'Everything in the sun-shadow Decision stands, with one change. When the tide forecast puts spring low water less than one tide step away, the page pool grows from 4,096 to 6,144 pages. ' +
              'The extra 128 MB comes from the far SDF GI cascade, which stops updating while the sun is low over the flats; GI out there holds its last result for those minutes. ' +
              'The pool shrinks back once the tide passes mid flood. On the spring-tide trace the peak of 5,912 pages fits with 232 to spare.',
          },
          {
            type: 'AcceptDecision',
            decisionId: 'render.dec-vsm-grow',
          },
          {
            type: 'ResolveIssue',
            issueId: 'render.iss-vsm-tide',
            resolution: 'resolved',
            resolvedBy: ['render.dec-vsm-grow'],
          },
        ],
      },
      {
        key: 'b1b',
        at: at('2026-09-30 10:00'),
        author: 'ines',
        subject: 'Summarize Lantern after the page pool change',
        events: [
          {
            type: 'WriteCompaction',
            effort: 'render',
            key: 'cmp-5',
            title: 'Lantern after the spring-tide page pool change',
            created_by: 'Ines Okafor',
            derives_from: [
              'render.dec-vsm-grow',
              'render.dec-vb-6',
              'render.dec-tern',
              'render.dec-presets-4b',
              'render.dec-brine-3',
              'render.dec-tern-reactive',
              'render.con-120-2',
              'render.iss-caustic-flicker',
              'render.iss-hdr-cert',
              'render.rsk-hdr-cert',
            ],
            body:
              'Sun shadows: virtual shadow maps, with the page pool growing to 6,144 pages near spring low water and the far GI cascade lending its memory. The spring low tide blocker is closed. ' +
              'Geometry: visibility buffer on all platforms, Skiff resolving materials at half rate. Upscaling: Tern only, four presets including Ultra Performance for the 120 Hz mode, with the saltglass reactive mask. ' +
              'Tonemapping: Brine with the HDR shoulder at 800 nits. Open: caustic flicker under Tern, and Meridian HDR certification, whose slip risk is realized.',
          },
        ],
      },
    ],
  },
  {
    name: 'tomasz/vsm-evict',
    pr: 44,
    author: 'tomasz',
    title: 'Coarser shadow pages on exposed wet sand',
    commits: [
      {
        key: 'b2a',
        at: at('2026-09-29 16:00'),
        author: 'tomasz',
        subject:
          'Evict fine wet-sand shadow pages first and draw them a level coarser',
        proof: ['render.dec-vsm-coarse'],
        files: { 'engine/lantern/shadows/vsm_pool.rs': VSM_POOL_COARSE },
        events: [
          {
            type: 'WriteFinding',
            effort: 'render',
            key: 'fnd-coarse-pages',
            kind: 'measurement',
            title:
              'Coarser wet-sand pages keep spring low tide at 3,980 shadow pages',
            created_by: 'Tomasz Brandt',
            derives_from: ['render.fnd-vsm-overflow'],
            body:
              'With exposed wet sand drawn one page level coarser, the spring-tide trace on the flats peaks at 3,980 pages, inside the 4,096-page pool. ' +
              'Shadow edges on the wet sand soften from about 9 cm to 18 cm at 300 m. Yusuf Demir could not see the difference at gameplay distance.',
          },
          {
            type: 'WriteDecision',
            effort: 'render',
            key: 'dec-vsm-coarse',
            title:
              'Use virtual shadow maps for the sun with coarser pages on exposed wet sand',
            created_by: 'Tomasz Brandt',
            supersedes: ['render.dec-vsm'],
            derives_from: ['render.fnd-coarse-pages', 'render.iss-vsm-tide'],
            body:
              'Everything in the sun-shadow Decision stands, except that exposed wet sand gets shadow pages one level coarser, and fine pages on wet sand are evicted first. ' +
              'The pool stays at 4,096 pages and 256 MB, so no other system gives up memory.',
          },
        ],
      },
    ],
  },
  {
    name: 'kenji/tide-lod',
    pr: 46,
    author: 'kenji',
    title: 'Step far tide cells at a quarter rate',
    commits: [
      {
        key: 'b3a',
        at: at('2026-09-30 11:00'),
        author: 'kenji',
        subject: 'Step tide cells beyond 600 m every fourth tick',
        proof: ['world.dec-tide-lod-quarter'],
        files: {
          'engine/kestrel/tides/mod.rs': TIDES_MOD_LOD,
          'engine/kestrel/tides/lod.rs': LOD_QUARTER,
        },
        events: [
          {
            type: 'AcceptDecision',
            decisionId: 'world.dec-tide-lod-quarter',
          },
          {
            type: 'ResolveIssue',
            issueId: 'world.iss-tide-lod-q',
            resolution: 'resolved',
            resolvedBy: ['world.dec-tide-lod-quarter'],
          },
        ],
      },
      {
        key: 'b3b',
        at: at('2026-09-30 15:00'),
        author: 'kenji',
        subject: 'Summarize the world core with tide LOD',
        events: [
          {
            type: 'WriteCompaction',
            effort: 'world',
            key: 'cmp-5',
            title: 'World core state with tide level of detail',
            created_by: 'Kenji Arakawa',
            derives_from: [
              'world.dec-tide-lod-quarter',
              'world.con-pool-3',
              'world.dec-tide-harmonic',
              'world.dec-gull-bytecode',
              'world.dec-cell-192',
              'world.dec-jobs-6',
              'world.dec-tide-fixed',
              'world.dec-save-version',
              'world.iss-blk-save-harmonic',
              'world.iss-blk-io-starve',
            ],
            body:
              'Tides: 32.32 fixed point with a second harmonic; cells beyond 600 m from every player now step at a quarter of the tide rate, which settles the far-cell question. ' +
              'Streaming: 192 m cells, a 1.6 GB pool. Jobs and Gull share one thread pool with continuation waits; Gull runs as bytecode. Saves carry a schema version. ' +
              'Open blockers: beta saves lack the harmonic phase, and tide turns starve inland reads.',
          },
        ],
      },
    ],
  },
  {
    name: 'priya/skiff-cpu',
    pr: 48,
    author: 'priya',
    title: 'Free Skiff CPU time for tide storms',
    commits: [
      {
        key: 'b4a',
        at: at('2026-09-30 12:00'),
        author: 'priya',
        subject: 'Cap tide-storm particles at 6,000 on Skiff',
        proof: ['ports.dec-storm-cap'],
        files: { 'platform/skiff/storm.rs': STORM_CAP },
        events: [
          {
            type: 'Retract',
            recordId: 'ports.fnd-storm-capture',
            reason:
              'Captured with the particle debug overlay on, which alone costs 1.4 ms of CPU. The retail recapture replaces it.',
          },
          {
            type: 'WriteFinding',
            effort: 'ports',
            key: 'fnd-storm-recapture',
            kind: 'measurement',
            title:
              'Tide storms push Skiff 40 Hz frames to 27.0 ms on the CPU with the overlay off',
            created_by: 'Priya Natarajan',
            derives_from: ['ports.iss-blk-storm'],
            body:
              'Priya Natarajan recaptured the storm sequence on retail firmware with the particle debug overlay off. The CPU frame peaks at 27.0 ms in the 40 Hz mode, 2 ms over the 25 ms budget. ' +
              'Storm particles and their tide collision cost 4.9 ms of it, so the 6,000-particle cap brings the peak to about 23.2 ms.',
          },
          {
            type: 'AcceptDecision',
            decisionId: 'ports.dec-storm-cap',
          },
          {
            type: 'ResolveIssue',
            issueId: 'ports.iss-blk-storm',
            resolution: 'resolved',
            resolvedBy: ['ports.dec-storm-cap'],
          },
        ],
      },
      {
        key: 'b4b',
        at: at('2026-09-30 16:00'),
        author: 'priya',
        subject:
          'Freeze far tide cells on every platform and catch them up on approach',
        proof: ['world.dec-tide-lod-freeze'],
        files: {
          'engine/kestrel/tides/mod.rs': TIDES_MOD_LOD,
          'engine/kestrel/tides/lod.rs': LOD_FREEZE,
        },
        events: [
          {
            type: 'WriteDecision',
            effort: 'world',
            key: 'dec-tide-lod-freeze',
            title:
              'Freeze tide cells beyond 600 m and catch them up when a player comes near',
            created_by: 'Priya Natarajan',
            derives_from: ['world.iss-tide-lod-q', 'world.con-tide-bitexact'],
            body:
              'Cells more than 600 m from every player stop stepping. When a player comes within 600 m, the cell runs its missed ticks in one batch, which costs at most 0.6 ms in that frame. ' +
              'Freezing saves the whole step for far cells: the Skiff tide step drops from 0.9 ms to 0.25 ms on the coast map, against 0.4 ms for stepping them at a quarter rate. ' +
              'Priya Natarajan needs that time for tide storms on Skiff.',
          },
          {
            type: 'AcceptDecision',
            decisionId: 'world.dec-tide-lod-freeze',
          },
          {
            type: 'ResolveIssue',
            issueId: 'world.iss-tide-lod-q',
            resolution: 'resolved',
            resolvedBy: ['world.dec-tide-lod-freeze'],
          },
        ],
      },
    ],
  },
];

export default { main, branches };

/** Every commit, main first, each with its branch name. */
export function specCommits() {
  return [
    ...main.map((c) => ({ ...c, branch: 'main' })),
    ...branches.flatMap((b) =>
      b.commits.map((c) => ({ ...c, branch: b.name }))
    ),
  ];
}

/** Every declared code anchor, keyed `<effort>.<key>`, with its branch. */
export function specAnchors() {
  return specCommits().flatMap((c) =>
    (c.events ?? [])
      .filter((e) => e.type === 'Anchor')
      .map((e) => ({ ...e, key: `${e.effort}.${e.key}`, branch: c.branch }))
  );
}
