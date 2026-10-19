# The benchmark world: Saltglass Reach

Every record in this benchmark describes one fictional game project. The names
are invented so that no model can answer from what it already knows. Authors
must keep to the facts below so that the five Efforts agree with each other.

## The game

**Saltglass Reach** is a co-op exploration game for one to four players.
Players cross a coast of dunes made of _saltglass_: a refractive, partly
transparent crystal. Tides rise and fall on a 40-minute cycle and reshape the
terrain as they go, burying or exposing paths. A day lasts 90 minutes.

The two features that drive the hardest engineering are:

1. **Saltglass rendering.** Light refracts and casts caustics through glass
   dunes, cliffs, and ruins seen from up to 2 km away.
2. **Tides.** The tide simulation changes the walkable world, so streaming,
   physics, save games, and co-op sync all depend on it.

## The studio and its people

The studio is **Tidewater Forge**. Use these names in `created_by` and in
prose. Refer to people by name, never by pronoun.

| Name            | Role                      | Usual Effort |
| --------------- | ------------------------- | ------------ |
| Ines Okafor     | Rendering lead            | render       |
| Tomasz Brandt   | Graphics engineer         | render       |
| Yusuf Demir     | Technical artist          | render       |
| Rhea Valdés     | Engine lead               | world        |
| Kenji Arakawa   | Streaming engineer        | world        |
| Marta Lindqvist | Gameplay systems engineer | world        |
| Priya Natarajan | Platform engineer         | ports        |
| Liam O'Connell  | Build and tools engineer  | tools        |
| Sofia Marchetti | Network engineer          | netcode      |
| Dara Whitlock   | Producer                  | any          |

## The technology

- **Kestrel** is the in-house engine.
- **Lantern** is Kestrel's renderer.
- **Gull** is Kestrel's gameplay scripting language.
- **Tern** is the studio's own temporal upscaler, written inside Lantern.
- **Kelp** is the studio's own asset compression codec.

## Platforms

| Platform | Kind             | Memory for the game | Display targets          |
| -------- | ---------------- | ------------------- | ------------------------ |
| PC       | Desktop          | varies              | 60 Hz and 120 Hz         |
| Meridian | Home console     | 13.5 GB             | 60 Hz; 120 Hz mode later |
| Skiff    | Handheld console | 9 GB, later 8 GB    | 30 Hz and 40 Hz          |

Meridian and Skiff are fictional consoles. Ports own Skiff's numbers.

## Timeline

The project runs from **2025-09-01** to **2026-09-30**. All record times fall
inside it.

| Date       | Milestone                                  |
| ---------- | ------------------------------------------ |
| 2025-09-01 | Pre-production starts                      |
| 2025-12-15 | Vertical slice                             |
| 2026-03-02 | Alpha                                      |
| 2026-06-01 | Beta; Skiff port becomes a launch platform |
| 2026-08-24 | Content lock                               |
| 2026-09-30 | Release candidate                          |

## The Efforts

Five Efforts hold the work. Each has its own spec file and question file.

| Key       | Title                                       | Size    | Final status |
| --------- | ------------------------------------------- | ------- | ------------ |
| `render`  | Lantern renderer overhaul                   | complex | active       |
| `world`   | Kestrel world streaming and simulation core | complex | active       |
| `ports`   | Meridian and Skiff ports                    | medium  | active       |
| `tools`   | Shader compile cache and build farm         | small   | completed    |
| `netcode` | Co-op rollback netcode prototype            | small   | abandoned    |

Proof forbids links between Efforts. When one Effort depends on another, its
record names the other record by its exact title in prose. These shared facts
must appear on both sides, in the form given here:

1. **Tide determinism.** `world` decides the tide simulation uses 32.32
   fixed-point math, after a finding that float tides drift apart between
   machines within 6 minutes. `netcode`'s final Decision to abandon rollback
   names that world Decision by title, and its reason: rollback must re-run
   tides every frame, which costs 4.8 ms on Skiff.
2. **Memory.** `ports` owns the Skiff memory Constraint (9 GB, later cut to
   8 GB). `world` owns the streaming pool Constraint (2.0 GB, later 1.6 GB);
   its cut names the Skiff Constraint by title as the reason.
3. **Frame rates.** `render` owns the Meridian 120 Hz performance mode and its
   8.3 ms budget. `ports` owns the Skiff 40 Hz mode and its 25 ms budget. Both
   Efforts contain a Constraint titled "Frame budget", so a careless reader
   confuses them.
4. **Shader caches.** `tools` owns the build farm's shader compile cache.
   `ports` owns the on-device pipeline cache for Skiff. Both are called
   "shader cache" in casual prose.
5. **Upscaling.** `render` owns Tern. `ports` decides Skiff runs Tern at a
   lower quality preset; that record names the render Decision by title.
