use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use chrono::Utc;
use anyhow::{Context, Result as AnyhowResult};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            load_csv,
            save_player,
            create_backup,
            write_csv_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
