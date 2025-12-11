use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::Command;
use chrono::Utc;
use anyhow::{Context, Result as AnyhowResult};
use tauri::menu::{MenuBuilder, SubmenuBuilder, MenuItemBuilder};
use tauri::{Manager, Emitter};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Player {
    #[serde(rename = "Barcode Number")]
    pub barcode: String,
    #[serde(rename = "Team")]
    pub team: String,
    #[serde(rename = "First Name")]
    pub first_name: String,
    #[serde(rename = "Last Name")]
    pub last_name: String,
    #[serde(rename = "Jersey Number")]
    pub jersey_number: String,
    #[serde(rename = "Coach")]
    pub coach: String,
    #[serde(rename = "Cell Phone")]
    pub cell_phone: String,
    #[serde(rename = "Email")]
    pub email: String,
    #[serde(rename = "Products")]
    pub products: String,
    #[serde(rename = "Packages")]
    pub packages: String,
    #[serde(flatten)]
    pub other_fields: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CSVData {
    pub players: Vec<Player>,
    pub teams: Vec<String>,
    pub file_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlayerUpdate {
    pub barcode: String,
    pub first_name: String,
    pub last_name: String,
    pub cell_phone: String,
    pub email: String,
    pub coach: String,
    pub products: String,
    pub packages: String,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn load_csv(file_path: String) -> Result<CSVData, String> {
    load_csv_file(&file_path).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_player(file_path: String, player_update: PlayerUpdate) -> Result<(), String> {
    save_player_data(&file_path, player_update).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_backup(file_path: String) -> Result<String, String> {
    create_backup_file(&file_path).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_csv_file(file_path: String, csv_content: String) -> Result<(), String> {
    write_csv_content(&file_path, csv_content).await.map_err(|e| e.to_string())
}

#[tauri::command]
fn run_update() -> Result<(), String> {
    // Find the repo directory
    // For AppImage: APPIMAGE env var points to the .AppImage file, repo is sibling dir
    // For macOS: The .app is in parent dir, repo is sibling dir
    let repo_dir = if cfg!(target_os = "linux") {
        // On Linux with AppImage, use APPIMAGE env var
        std::env::var("APPIMAGE")
            .ok()
            .and_then(|appimage_path| {
                Path::new(&appimage_path)
                    .parent()
                    .map(|p| p.join("MVS-form-filler"))
            })
            .ok_or("Could not determine repo directory from APPIMAGE")?
    } else {
        // On macOS, the .app bundle is in parent dir of repo
        std::env::current_exe()
            .map_err(|e| e.to_string())?
            .parent() // Contents/MacOS
            .and_then(|p| p.parent()) // Contents
            .and_then(|p| p.parent()) // .app bundle
            .and_then(|p| p.parent()) // parent dir
            .map(|p| p.join("MVS-form-filler"))
            .ok_or("Could not determine repo directory")?
    };

    let update_script = repo_dir.join("update.sh");

    if !update_script.exists() {
        return Err(format!("Update script not found at: {}", update_script.display()));
    }

    // Open a terminal and run the update script
    #[cfg(target_os = "linux")]
    {
        // Try common Linux terminal emulators
        let terminals = [
            ("gnome-terminal", vec!["--", "bash", "-c"]),
            ("konsole", vec!["-e", "bash", "-c"]),
            ("xfce4-terminal", vec!["-e"]),
            ("xterm", vec!["-e"]),
        ];

        for (term, args) in terminals.iter() {
            let mut cmd = Command::new(term);
            for arg in args {
                cmd.arg(arg);
            }
            cmd.arg(update_script.to_str().unwrap());

            if cmd.spawn().is_ok() {
                return Ok(());
            }
        }

        return Err("Could not find a terminal emulator".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-a")
            .arg("Terminal")
            .arg(&update_script)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        return Err("Unsupported operating system".to_string());
    }
}

async fn load_csv_file(file_path: &str) -> AnyhowResult<CSVData> {
    let content = fs::read_to_string(file_path)
        .with_context(|| format!("Failed to read file: {}", file_path))?;

    let mut reader = csv::Reader::from_reader(content.as_bytes());
    
    let mut players = Vec::new();
    let mut teams = std::collections::HashSet::new();

    for result in reader.deserialize() {
        let player: Player = result?;
        teams.insert(player.team.clone());
        players.push(player);
    }

    let mut teams_vec: Vec<String> = teams.into_iter().collect();
    teams_vec.sort();

    Ok(CSVData {
        players,
        teams: teams_vec,
        file_path: file_path.to_string(),
    })
}

async fn save_player_data(file_path: &str, player_update: PlayerUpdate) -> AnyhowResult<()> {
    // First, create a backup
    create_backup_file(file_path).await?;

    // Load current data
    let mut csv_data = load_csv_file(file_path).await?;

    // Find and update the player
    if let Some(player) = csv_data.players.iter_mut().find(|p| p.barcode == player_update.barcode) {
        player.first_name = player_update.first_name;
        player.last_name = player_update.last_name;
        player.cell_phone = player_update.cell_phone;
        player.email = player_update.email;
        player.coach = player_update.coach;
        player.products = player_update.products;
        player.packages = player_update.packages;
    }

    // Write back to file
    let mut writer = csv::Writer::from_path(file_path)?;
    
    for player in &csv_data.players {
        writer.serialize(player)?;
    }
    
    writer.flush()?;
    Ok(())
}

async fn write_csv_content(file_path: &str, csv_content: String) -> AnyhowResult<()> {
    use std::path::Path;
    
    let path = Path::new(file_path);
    
    // If it's just a filename (no directory separators), save to Downloads folder
    let target_path = if path.parent().is_none() || path.parent() == Some(Path::new("")) {
        // Get the user's home directory and create Downloads path
        let home_dir = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let downloads_path = Path::new(&home_dir).join("Downloads").join(file_path);
        downloads_path
    } else {
        path.to_path_buf()
    };

    // Create backup before overwriting if file exists
    if target_path.exists() {
        create_backup_file(target_path.to_str().unwrap()).await?;
    }
    
    // Write new content to the file
    fs::write(&target_path, csv_content)
        .with_context(|| format!("Failed to write CSV content to file: {}", target_path.display()))?;
    
    println!("CSV file saved to: {}", target_path.display());
    Ok(())
}

async fn create_backup_file(file_path: &str) -> AnyhowResult<String> {
    let path = Path::new(file_path);
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    
    let backup_path = if let Some(parent) = path.parent() {
        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("backup");
        let extension = path.extension().and_then(|s| s.to_str()).unwrap_or("csv");
        parent.join(format!("{}_backup_{}.{}", stem, timestamp, extension))
    } else {
        Path::new(&format!("backup_{}.csv", timestamp)).to_path_buf()
    };

    fs::copy(file_path, &backup_path)
        .with_context(|| format!("Failed to create backup at {:?}", backup_path))?;

    Ok(backup_path.to_string_lossy().to_string())
}

// Helper function to get the parent directory where sister folders are located
fn get_parent_dir() -> Result<std::path::PathBuf, String> {
    if cfg!(target_os = "linux") {
        // On Linux with AppImage, use APPIMAGE env var
        std::env::var("APPIMAGE")
            .ok()
            .and_then(|appimage_path| {
                Path::new(&appimage_path)
                    .parent()
                    .map(|p| p.to_path_buf())
            })
            .ok_or_else(|| "Could not determine parent directory from APPIMAGE".to_string())
    } else {
        // On macOS, the .app bundle is in parent dir
        std::env::current_exe()
            .map_err(|e| e.to_string())?
            .parent() // Contents/MacOS
            .and_then(|p| p.parent()) // Contents
            .and_then(|p| p.parent()) // .app bundle
            .and_then(|p| p.parent()) // parent dir
            .map(|p| p.to_path_buf())
            .ok_or_else(|| "Could not determine parent directory".to_string())
    }
}

#[tauri::command]
fn git_pull() -> Result<String, String> {
    let parent_dir = get_parent_dir()?;
    let barcodes_dir = parent_dir.join("mvs-job-barcodes");

    if !barcodes_dir.exists() {
        // Clone the repository
        println!("Cloning mvs-job-barcodes repository...");
        let output = Command::new("git")
            .args(["clone", "git@github.com:SonicKurt/mvs-job-barcodes.git"])
            .current_dir(&parent_dir)
            .output()
            .map_err(|e| format!("Failed to run git clone: {}", e))?;

        if output.status.success() {
            Ok("Repository cloned successfully!".to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Git clone failed: {}", stderr))
        }
    } else {
        // Pull latest changes
        println!("Pulling latest changes in mvs-job-barcodes...");
        let output = Command::new("git")
            .args(["pull"])
            .current_dir(&barcodes_dir)
            .output()
            .map_err(|e| format!("Failed to run git pull: {}", e))?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            Ok(format!("Pull successful: {}", stdout.trim()))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Git pull failed: {}", stderr))
        }
    }
}

#[tauri::command]
fn git_push(commit_message: String) -> Result<String, String> {
    let parent_dir = get_parent_dir()?;
    let barcodes_dir = parent_dir.join("mvs-job-barcodes");

    if !barcodes_dir.exists() {
        return Err("mvs-job-barcodes folder not found. Please pull first.".to_string());
    }

    // Git add
    println!("Adding changes...");
    let add_output = Command::new("git")
        .args(["add", "."])
        .current_dir(&barcodes_dir)
        .output()
        .map_err(|e| format!("Failed to run git add: {}", e))?;

    if !add_output.status.success() {
        let stderr = String::from_utf8_lossy(&add_output.stderr);
        return Err(format!("Git add failed: {}", stderr));
    }

    // Git commit
    println!("Committing changes...");
    let commit_output = Command::new("git")
        .args(["commit", "-m", &commit_message])
        .current_dir(&barcodes_dir)
        .output()
        .map_err(|e| format!("Failed to run git commit: {}", e))?;

    if !commit_output.status.success() {
        let stderr = String::from_utf8_lossy(&commit_output.stderr);
        let stdout = String::from_utf8_lossy(&commit_output.stdout);
        // Check if it's just "nothing to commit"
        if stdout.contains("nothing to commit") || stderr.contains("nothing to commit") {
            return Err("Nothing to commit - no changes detected.".to_string());
        }
        return Err(format!("Git commit failed: {}", stderr));
    }

    // Git push
    println!("Pushing changes...");
    let push_output = Command::new("git")
        .args(["push"])
        .current_dir(&barcodes_dir)
        .output()
        .map_err(|e| format!("Failed to run git push: {}", e))?;

    if push_output.status.success() {
        Ok("Changes pushed successfully!".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&push_output.stderr);
        Err(format!("Git push failed: {}", stderr))
    }
}

#[tauri::command]
fn get_barcodes_path() -> Result<String, String> {
    let parent_dir = get_parent_dir()?;
    let barcodes_dir = parent_dir.join("mvs-job-barcodes");
    Ok(barcodes_dir.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Create menu items
            let open_item = MenuItemBuilder::new("Open")
                .id("open")
                .build(app)?;

            let update_item = MenuItemBuilder::new("Update App")
                .id("update")
                .build(app)?;

            let pull_item = MenuItemBuilder::new("Pull")
                .id("pull")
                .build(app)?;

            let push_item = MenuItemBuilder::new("Push")
                .id("push")
                .build(app)?;

            // Create File submenu
            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&open_item)
                .item(&update_item)
                .build()?;

            // Create Git submenu
            let git_menu = SubmenuBuilder::new(app, "Git")
                .item(&pull_item)
                .item(&push_item)
                .build()?;

            // Build the menu bar
            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .item(&git_menu)
                .build()?;

            // Set the menu - on macOS it must be set on the app, on Linux on the window
            #[cfg(target_os = "macos")]
            app.set_menu(menu)?;

            #[cfg(not(target_os = "macos"))]
            if let Some(window) = app.get_webview_window("main") {
                window.set_menu(menu)?;
            }

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            println!("Menu item clicked: {}", id);

            match id {
                "open" => {
                    let _ = app.emit("menu-open-file", ());
                }
                "update" => {
                    let _ = app.emit("menu-update-app", ());
                }
                "pull" => {
                    let _ = app.emit("menu-git-pull", ());
                }
                "push" => {
                    let _ = app.emit("menu-git-push", ());
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            load_csv,
            save_player,
            create_backup,
            write_csv_file,
            run_update,
            git_pull,
            git_push,
            get_barcodes_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
