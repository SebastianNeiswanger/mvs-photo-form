import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { exit } from '@tauri-apps/plugin-process';
import { CSVData, Player, FormData, ItemConfig } from './types';
import { parseQuantitiesFromCSV, updatePlayerInCSV } from './csvUtils';
import { ITEMS_BY_CODE, PRODUCT_ITEMS, FAMILY_ITEMS, TEAM_ITEMS, COACH_CONFIG, convertCSVQuantitiesToInternal } from './config';
import { PackageGrid } from './components/PackageGrid';
import { ItemWithSubProducts } from './components/ItemWithSubProducts';
import { EmailAutocomplete } from './components/EmailAutocomplete';
import { ToastContainer, toast } from './components/Toast';
import { TauriFileOperations } from './tauriFileOperations';
import { ErrorHandler, AppError, ErrorCodes } from './errorHandling';
import {
  cleanCoachSuffixFromFullName,
  cleanNoOrderSuffixFromFullName,
  isPlaceholderName,
  isPlayerCoach,
  isNoOrderPlayer,
  formatPlayerNameWithIcons
} from './coachUtils';
import {
  formatPhoneNumber,
  getPhoneDigits,
  getValidationState
} from './validation';
import "./App.css";


function App() {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [originalFilePath, setOriginalFilePath] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    isCoach: false,
    quantities: {},
  });
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  
  // Ref for name input field to enable focusing
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Validation state
  const validationState = getValidationState(formData.phone, formData.email);

  // Helper function to filter and group items with sub-products
  const useItemsWithSubProducts = (items: ItemConfig[]) => {
    return useMemo(() => {
      // Filter out sub-products from the main list
      const topLevelItems = items.filter(item => !item.isSubProduct);

      // Group sub-products by parent code
      const subProductsByParent = items
        .filter(item => item.isSubProduct && item.parentCode)
        .reduce((acc, item) => {
          const parent = item.parentCode!;
          if (!acc[parent]) {
            acc[parent] = [];
          }
          acc[parent].push(item);
          return acc;
        }, {} as { [key: string]: ItemConfig[] });

      return { topLevelItems, subProductsByParent };
    }, [items]);
  };

  // Get filtered and grouped items for each category
  const productItemsWithSubs = useItemsWithSubProducts(PRODUCT_ITEMS);
  const familyItemsWithSubs = useItemsWithSubProducts(FAMILY_ITEMS);
  const teamItemsWithSubs = useItemsWithSubProducts(TEAM_ITEMS);

  const loadPlayerData = useCallback((player: Player) => {
    const fullName = `${player.firstName} ${player.lastName}`.trim();
    let cleanDisplayName = cleanCoachSuffixFromFullName(fullName);
    cleanDisplayName = cleanNoOrderSuffixFromFullName(cleanDisplayName);
    const isCoach = isPlayerCoach(player.coach);
    
    // Handle placeholder names - don't populate the input with generic names
    const displayNameForInput = isPlaceholderName(cleanDisplayName) ? '' : cleanDisplayName;
    
    const productQuantities = parseQuantitiesFromCSV(player.products);
    const packageQuantities = parseQuantitiesFromCSV(player.packages);
    
    // Convert CSV quantities to internal format (DD in products -> DDPr, DD in packages -> DDPa)
    const internalQuantities = convertCSVQuantitiesToInternal(productQuantities, packageQuantities);
    
    console.log('🔄 Loading player data:', {
      barcode: player.barcode,
      originalName: fullName,
      cleanName: cleanDisplayName,
      isPlaceholder: isPlaceholderName(cleanDisplayName),
      inputName: displayNameForInput,
      coachField: player.coach,
      isCoachCheckbox: isCoach,
      productQuantities,
      packageQuantities,
      internalQuantities
    });
    
    setSelectedPlayer(player);
    setFormData({
      name: displayNameForInput,
      phone: formatPhoneNumber(player.cellPhone || ''),
      email: player.email,
      isCoach,
      quantities: internalQuantities,
    });
  }, []);

  // Dynamic 810T management for coach checkbox
  useEffect(() => {
    if (!selectedPlayer) return;
    
    setFormData(prev => {
      const newQuantities = { ...prev.quantities };
      
      if (prev.isCoach) {
        // Add 810T if not already present
        if (!newQuantities[COACH_CONFIG.FREE_ITEM_CODE]) {
          newQuantities[COACH_CONFIG.FREE_ITEM_CODE] = 1;
          console.log('🎯 Added free 810T for coach');
        }
      } else {
        // Remove 810T if present
        if (newQuantities[COACH_CONFIG.FREE_ITEM_CODE]) {
          delete newQuantities[COACH_CONFIG.FREE_ITEM_CODE];
          console.log('🎯 Removed 810T (no longer coach)');
        }
      }
      
      return {
        ...prev,
        quantities: newQuantities
      };
    });
  }, [formData.isCoach, selectedPlayer]);

  // Removed browser-based file processing functions - using native desktop dialog instead

  const handleTauriFileSelect = useCallback(async () => {
    if (isLoadingFile) return;
    
    const errorHandler = ErrorHandler.getInstance();
    const fileOps = TauriFileOperations.getInstance();
    
    setIsLoadingFile(true);
    console.log('🗂️ Opening file dialog with Tauri...');
    
    try {
      // Use standard Tauri dialog plugin
      const filePath = await fileOps.selectCSVFile();
      
      if (!filePath) {
        console.log('No file selected');
        return;
      }
      
      console.log('📁 File selected:', filePath);
      
      // Validate file extension
      const fileName = filePath.split(/[\\/]/).pop() || 'unknown.csv';
      if (!fileName.toLowerCase().endsWith('.csv')) {
        throw new AppError(
          'Invalid file type',
          ErrorCodes.VALIDATION_ERROR,
          { filePath, fileName },
          'Please select a CSV file (.csv extension required).'
        );
      }
      
      // Store the full path
      setOriginalFilePath(filePath);
      
      // Load and parse CSV using standard Tauri fs plugin
      console.log('📁 Loading CSV via Tauri fs plugin...');
      const frontendData = await fileOps.loadCSVFile(filePath);
      
      setCsvData(frontendData);
      console.log('✅ CSV data loaded successfully, teams:', frontendData.teams);
      
      if (frontendData.teams.length > 0) {
        setSelectedTeam(frontendData.teams[0]);
        const firstTeamPlayers = frontendData.teamPlayersMap.get(frontendData.teams[0]) || [];
        setTeamPlayers(firstTeamPlayers);
        
        if (firstTeamPlayers.length > 0) {
          setCurrentPlayerIndex(0);
          loadPlayerData(firstTeamPlayers[0]);
        }
        
        console.log(`✅ Successfully loaded ${frontendData.players.length} players from ${frontendData.teams.length} teams!`);
      } else {
        alert('No teams found in the CSV file. Please check the file format.');
      }
      
    } catch (error) {
      const appError = error instanceof AppError
        ? error
        : new AppError(
            `Failed to open file: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCodes.FILE_ACCESS_DENIED,
            { error },
            'Failed to open the CSV file. Please check the file exists and you have permission to read it.'
          );
      
      errorHandler.handleError(appError, {
        showUserAlert: true,
        logToConsole: true,
        includeStackTrace: true
      });
    } finally {
      setIsLoadingFile(false);
    }
  }, [isLoadingFile, loadPlayerData]);

  // Helper function to detect if player data has actually changed
  const hasPlayerDataChanged = useCallback((currentPlayer: Player, newFormData: typeof formData): boolean => {
    // Check if name changed
    const nameParts = newFormData.name.trim().split(' ');
    const newFirstName = nameParts[0] || '';
    const newLastName = nameParts.slice(1).join(' ') || '';
    
    if (currentPlayer.firstName !== newFirstName || currentPlayer.lastName !== newLastName) {
      return true;
    }
    
    // Check if contact info changed (compare raw phone digits)
    const newPhoneDigits = getPhoneDigits(newFormData.phone);
    if (currentPlayer.cellPhone !== newPhoneDigits || currentPlayer.email !== newFormData.email) {
      return true;
    }
    
    // Check if coach status changed
    const currentIsCoach = currentPlayer.coach === 'Y';
    if (currentIsCoach !== newFormData.isCoach) {
      return true;
    }
    
    // Check if quantities changed by comparing with current CSV data
    const currentProductQuantities = parseQuantitiesFromCSV(currentPlayer.products);
    const currentPackageQuantities = parseQuantitiesFromCSV(currentPlayer.packages);
    const currentInternalQuantities = convertCSVQuantitiesToInternal(currentProductQuantities, currentPackageQuantities);
    const newQuantities = { ...newFormData.quantities };
    
    // Compare quantities
    const allItemCodes = new Set([...Object.keys(currentInternalQuantities), ...Object.keys(newQuantities)]);
    for (const itemCode of allItemCodes) {
      if ((currentInternalQuantities[itemCode] || 0) !== (newQuantities[itemCode] || 0)) {
        return true;
      }
    }
    
    return false;
  }, []);

  const saveCurrentPlayer = useCallback(async () => {
    console.log('=== TAURI AUTO-SAVE TRIGGERED ===');
    console.log('csvData exists:', !!csvData);
    console.log('selectedPlayer exists:', !!selectedPlayer);
    console.log('originalFilePath:', originalFilePath);
    console.log('formData:', formData);
    
    if (!csvData || !selectedPlayer) {
      console.log('AUTO-SAVE SKIPPED: Missing csvData or selectedPlayer');
      return;
    }
    
    if (!originalFilePath) {
      console.log('AUTO-SAVE SKIPPED: No original file path stored');
      return;
    }
    
    // Check if player data actually changed before saving
    const hasChanges = hasPlayerDataChanged(selectedPlayer, formData);
    if (!hasChanges) {
      console.log('AUTO-SAVE SKIPPED: No changes detected in player data');
      return;
    }
    
    try {
      console.log('Updating player in CSV data...');
      
      // Pass internal quantities directly - csvUtils.ts handles conversion after proper filtering
      // Convert formatted phone back to raw digits for storage
      const formDataForSave = {
        ...formData,
        phone: getPhoneDigits(formData.phone)
      };
      
      const updatedData = updatePlayerInCSV(
        csvData,
        selectedPlayer.barcode,
        formDataForSave,
        formData.quantities
      );
      
      console.log('✅ Local data updated, saving to file...');
      
      // Save the entire updated CSV file using Tauri fs plugin
      const fileOps = TauriFileOperations.getInstance();
      await fileOps.saveCSVFile(updatedData, originalFilePath);
      
      console.log('✅ CSV file auto-saved via Tauri fs plugin to:', originalFilePath);
      
      // Update local state
      setCsvData(updatedData);
      console.log('✅ Local state synchronized');
      
      // Reload current player data to reflect any business logic changes (like -N suffixes)
      if (selectedPlayer) {
        const updatedPlayer = updatedData.playersMap.get(selectedPlayer.barcode);
        if (updatedPlayer) {
          console.log('🔄 Reloading player data to reflect CSV changes');
          
          // Update the selected player reference
          setSelectedPlayer(updatedPlayer);
          
          // Update the team players list to reflect changes
          const updatedTeamPlayers = updatedData.teamPlayersMap.get(selectedTeam) || [];
          setTeamPlayers(updatedTeamPlayers);
          
          // Reload form data with updated player information
          loadPlayerData(updatedPlayer);
        }
      }
      
    } catch (error) {
      const errorHandler = ErrorHandler.getInstance();
      const appError = error instanceof AppError
        ? error
        : new AppError(
            `Tauri auto-save failed: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCodes.SAVE_ERROR,
            { 
              playerBarcode: selectedPlayer.barcode,
              filePath: originalFilePath,
              error 
            },
            'Failed to save changes to the original file. Your changes are preserved in the app. Please try navigating to another player to retry saving.'
          );
      
      errorHandler.handleError(appError, {
        showUserAlert: false, // Don't interrupt the user workflow with alerts for auto-save failures
        logToConsole: true,
        includeStackTrace: true
      });
    }
    console.log('=== TAURI AUTO-SAVE COMPLETE ===');
  }, [csvData, selectedPlayer, formData, originalFilePath, hasPlayerDataChanged]);


  const handleTeamChange = useCallback(async (teamName: string) => {
    console.log('🔄 TEAM CHANGE triggered for team:', teamName);
    if (!csvData) {
      console.log('❌ TEAM CHANGE: No csvData available');
      return;
    }
    
    console.log('🔄 TEAM CHANGE: Calling saveCurrentPlayer...');
    await saveCurrentPlayer();
    console.log('🔄 TEAM CHANGE: Save complete, updating team selection');
    
    setSelectedTeam(teamName);
    const players = csvData.teamPlayersMap.get(teamName) || [];
    setTeamPlayers(players);
    
    if (players.length > 0) {
      setCurrentPlayerIndex(0);
      loadPlayerData(players[0]);
    }
    console.log('✅ TEAM CHANGE: Complete');
  }, [csvData, saveCurrentPlayer, loadPlayerData]);

  const handlePlayerChange = useCallback(async (playerBarcode: string) => {
    console.log('👤 PLAYER CHANGE triggered for barcode:', playerBarcode);
    if (!csvData) {
      console.log('❌ PLAYER CHANGE: No csvData available');
      return;
    }
    
    console.log('👤 PLAYER CHANGE: Calling saveCurrentPlayer...');
    await saveCurrentPlayer();
    console.log('👤 PLAYER CHANGE: Save complete, switching to new player');
    
    const player = csvData.playersMap.get(playerBarcode);
    if (player) {
      const playerIndex = teamPlayers.findIndex(p => p.barcode === playerBarcode);
      if (playerIndex !== -1) {
        setCurrentPlayerIndex(playerIndex);
        loadPlayerData(player);
      }
    }
    console.log('✅ PLAYER CHANGE: Complete');
  }, [csvData, teamPlayers, saveCurrentPlayer, loadPlayerData]);

  const navigatePlayer = useCallback(async (direction: 'next' | 'prev') => {
    console.log('⬅️➡️ PLAYER NAVIGATION triggered:', direction);
    if (teamPlayers.length === 0) {
      console.log('❌ PLAYER NAVIGATION: No team players available');
      return;
    }
    
    console.log('⬅️➡️ PLAYER NAVIGATION: Calling saveCurrentPlayer...');
    await saveCurrentPlayer();
    console.log('⬅️➡️ PLAYER NAVIGATION: Save complete, navigating to next player');
    
    const newIndex = direction === 'next' 
      ? Math.min(currentPlayerIndex + 1, teamPlayers.length - 1)
      : Math.max(currentPlayerIndex - 1, 0);
    
    console.log('⬅️➡️ PLAYER NAVIGATION: Moving from index', currentPlayerIndex, 'to', newIndex);
    setCurrentPlayerIndex(newIndex);
    loadPlayerData(teamPlayers[newIndex]);
    
    // Focus the name field after navigation
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);
    
    console.log('✅ PLAYER NAVIGATION: Complete');
  }, [teamPlayers, currentPlayerIndex, saveCurrentPlayer, loadPlayerData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger on Enter key
      if (e.key !== 'Enter') return;

      // Don't trigger if user is typing in an input field or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') {
        return;
      }

      // Don't trigger if no team players available
      if (teamPlayers.length === 0) return;

      // Navigate to next player (same as clicking next button)
      if (currentPlayerIndex < teamPlayers.length - 1) {
        e.preventDefault();
        navigatePlayer('next');
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [teamPlayers, currentPlayerIndex, navigatePlayer]);

  // Listen for menu events from Tauri
  useEffect(() => {
    const unlisten = listen('menu-open-file', async () => {
      console.log('📂 Menu: Open file triggered');
      await saveCurrentPlayer();
      handleTauriFileSelect();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [saveCurrentPlayer, handleTauriFileSelect]);

  // Listen for update app menu event
  useEffect(() => {
    const unlisten = listen('menu-update-app', async () => {
      console.log('🔄 Menu: Update app triggered');
      await saveCurrentPlayer();
      try {
        await invoke('run_update');
        // Close the app after launching the update script
        await exit(0);
      } catch (error) {
        console.error('Failed to run update:', error);
        alert(`Failed to start update: ${error}`);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [saveCurrentPlayer]);

  // Listen for git pull menu event
  useEffect(() => {
    const unlisten = listen('menu-git-pull', async () => {
      console.log('📥 Menu: Git pull triggered');
      const toastId = toast.loading('Pulling latest changes...');
      try {
        const result = await invoke<string>('git_pull');
        toast.update(toastId, result, 'success');
      } catch (error) {
        console.error('Git pull failed:', error);
        toast.update(toastId, `Git pull failed: ${error}`, 'error');
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  // Listen for git push menu event
  useEffect(() => {
    const unlisten = listen('menu-git-push', async () => {
      console.log('📤 Menu: Git push triggered');
      const commitMessage = window.prompt('Enter commit message:');

      if (!commitMessage) {
        console.log('Git push cancelled - no commit message');
        return;
      }

      const toastId = toast.loading('Pushing changes...');
      try {
        const result = await invoke<string>('git_push', { commitMessage });
        toast.update(toastId, result, 'success');
      } catch (error) {
        console.error('Git push failed:', error);
        toast.update(toastId, `${error}`, 'error');
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const updateQuantity = useCallback((itemCode: string, change: number) => {
    setFormData(prev => ({
      ...prev,
      quantities: {
        ...prev.quantities,
        [itemCode]: Math.max(0, (prev.quantities[itemCode] || 0) + change)
      }
    }));
  }, []);

  const setQuantity = useCallback((itemCode: string, value: number) => {
    const quantity = Math.max(0, value);
    setFormData(prev => ({
      ...prev,
      quantities: {
        ...prev.quantities,
        [itemCode]: quantity
      }
    }));
  }, []);

  // Phone number formatting handler
  const handlePhoneChange = useCallback((value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  }, []);

  // Email change handler
  const handleEmailChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, email: value }));
  }, []);

  const calculateTotal = useCallback(() => {
    return Object.entries(formData.quantities).reduce((total, [itemCode, quantity]) => {
      const item = ITEMS_BY_CODE.get(itemCode);
      if (!item) return total;
      
      // Apply coach discount - 810T is free for coaches
      if (itemCode === COACH_CONFIG.FREE_ITEM_CODE && formData.isCoach) {
        return total; // Don't add price for free 810T
      }
      
      return total + (item.price * quantity);
    }, 0);
  }, [formData.quantities, formData.isCoach]);

  const getCoachDiscount = useCallback(() => {
    if (!formData.isCoach || !formData.quantities[COACH_CONFIG.FREE_ITEM_CODE]) {
      return 0;
    }
    const item = ITEMS_BY_CODE.get(COACH_CONFIG.FREE_ITEM_CODE);
    return item ? item.price * formData.quantities[COACH_CONFIG.FREE_ITEM_CODE] : 0;
  }, [formData.quantities, formData.isCoach]);

  const resetPlayerToOriginal = useCallback(async () => {
    if (!selectedPlayer) return;
    
    console.log('🔄 RESET PLAYER: Starting reset for player:', selectedPlayer.barcode);
    
    // Reset form data to original state with placeholder name based on array position
    const playerNumber = currentPlayerIndex + 1; // Convert 0-based index to 1-based number
    setFormData({
      name: `Player ${playerNumber}`,
      phone: '',
      email: '',
      isCoach: false,
      quantities: {},
    });
    
    // Trigger save to persist the reset state
    console.log('🔄 RESET PLAYER: Calling saveCurrentPlayer...');
    await saveCurrentPlayer();
    console.log('✅ RESET PLAYER: Complete');
  }, [selectedPlayer, currentPlayerIndex, saveCurrentPlayer]);

  if (!csvData) {
    return (
      <main className="container">
        <ToastContainer />
        <div className="header-with-logo">
          <img src="/logo.png" alt="MVS Logo" className="header-logo" />
          <h1>MVS Photo Form</h1>
        </div>
        <div className="file-selection">
          <h2>Select CSV File</h2>
          <div className="desktop-file-selection">
            <button
              onClick={handleTauriFileSelect}
              className="desktop-file-btn"
              disabled={isLoadingFile}
              title="Open CSV file for editing"
            >
              📂 Open CSV File
            </button>
            {isLoadingFile && <p className="loading-text">Loading CSV File...</p>}
          </div>
          <div className="desktop-file-help">
            <p>
              Select a CSV file to edit player information and manage orders.
              Changes will be saved directly to your original file.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <ToastContainer />
      <div className="header-with-logo">
        <img src="/logo.png" alt="MVS Logo" className="header-logo" />
        <h1>MVS Photo Form</h1>
      </div>

      <div className="navigation">
        <div className="nav-dropdowns">
          <div className="dropdown-group">
            <label htmlFor="team-select">Team:</label>
            <select 
              id="team-select"
              value={selectedTeam} 
              onChange={(e) => handleTeamChange(e.target.value)}
              className="team-select"
            >
              <option value="">Select Team</option>
              {csvData.teams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
          
          <div className="dropdown-group">
            <label htmlFor="player-select">Player:</label>
            <select 
              id="player-select"
              value={selectedPlayer?.barcode || ''} 
              onChange={(e) => handlePlayerChange(e.target.value)}
              className="player-select"
              disabled={!selectedTeam || teamPlayers.length === 0}
            >
              <option value="">Select Player</option>
              {teamPlayers.map(player => {
                // Get the clean display name for this player
                const isCoach = isPlayerCoach(player.coach);
                const isNoOrder = isNoOrderPlayer(player.lastName);
                let displayName = player.barcode === selectedPlayer?.barcode && formData.name
                  ? formData.name
                  : `${player.firstName} ${player.lastName}`.trim();
                
                // Clean suffixes from display name
                displayName = cleanCoachSuffixFromFullName(displayName);
                displayName = cleanNoOrderSuffixFromFullName(displayName);
                
                // Use barcode if name is placeholder or empty
                if (isPlaceholderName(displayName) || !displayName) {
                  displayName = player.barcode;
                }
                
                // Format with appropriate icons
                const formattedName = formatPlayerNameWithIcons(displayName, isCoach, isNoOrder);
                
                return (
                  <option key={player.barcode} value={player.barcode}>
                    {formattedName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        
        <div className="nav-buttons">
          <button 
            onClick={() => navigatePlayer('prev')}
            disabled={currentPlayerIndex === 0}
            className="nav-btn"
          >
            ←
          </button>
          <span className="player-counter">
            {teamPlayers.length > 0 ? `${currentPlayerIndex + 1}/${teamPlayers.length}` : '0/0'}
          </span>
          <button 
            onClick={() => navigatePlayer('next')}
            disabled={currentPlayerIndex === teamPlayers.length - 1}
            className="nav-btn"
          >
            →
          </button>
        </div>
      </div>

      <div className="form-layout">
        <div className="form-columns">
          <div className="column">
            <h3>Player Information</h3>
            <div className="form-group">
              <label>Name:</label>
              <input
                ref={nameInputRef}
                type="text"
                value={formData.name}
                placeholder={selectedPlayer && isPlaceholderName(`${selectedPlayer.firstName} ${selectedPlayer.lastName}`.trim())
                  ? cleanCoachSuffixFromFullName(`${selectedPlayer.firstName} ${selectedPlayer.lastName}`.trim())
                  : 'Enter player name'}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={(formData.quantities['C'] || 0) > 0 ? 'dd-selected-glow' : ''}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            <div className="form-group">
              <label>Phone:</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`${!validationState.phoneValid ? 'validation-error' : ''} ${
                  ((formData.quantities['DDPa'] || 0) > 0 ||
                   (formData.quantities['DDPr'] || 0) > 0 ||
                   (formData.quantities['DDF'] || 0) > 0 ||
                   (formData.quantities['DDT'] || 0) > 0) ? 'dd-selected-glow' : ''
                }`.trim()}
                placeholder="(123) 456-7890"
                maxLength={14}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {!validationState.phoneValid && formData.phone && (
                <span className="validation-message">Phone must be 10 digits</span>
              )}
            </div>
            <div className="form-group">
              <label>Email:</label>
              <EmailAutocomplete
                csvData={csvData}
                value={formData.email}
                onChange={handleEmailChange}
                validationError={!validationState.emailValid}
                ddGlow={
                  ((formData.quantities['DDPa'] || 0) > 0 ||
                   (formData.quantities['DDPr'] || 0) > 0 ||
                   (formData.quantities['DDF'] || 0) > 0 ||
                   (formData.quantities['DDT'] || 0) > 0)
                }
              />
              {!validationState.emailValid && formData.email && (
                <span className="validation-message">Please enter a valid email address</span>
              )}
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.isCoach}
                  onChange={(e) => setFormData(prev => ({ ...prev, isCoach: e.target.checked }))}
                />
                Coach
              </label>
            </div>
            
            <div className="total-section">
              <h4>Total: ${calculateTotal()}</h4>
              {formData.isCoach && getCoachDiscount() > 0 && (
                <p className="coach-discount">
                  🎯 Coach discount: 810T free (-${getCoachDiscount()})
                </p>
              )}
              
              <div className="nav-buttons secondary-nav">
                <button 
                  onClick={() => navigatePlayer('prev')}
                  disabled={currentPlayerIndex === 0}
                  className="nav-btn secondary"
                >
                  ←
                </button>
                <button 
                  onClick={() => navigatePlayer('next')}
                  disabled={currentPlayerIndex === teamPlayers.length - 1}
                  className="nav-btn secondary"
                >
                  →
                </button>
              </div>
            </div>
            
            <button 
              onClick={resetPlayerToOriginal}
              className="reset-player-btn"
              disabled={!selectedPlayer}
            >
              🔄 Reset Player
            </button>
          </div>

          <div className="column">
            <h3>Packages</h3>
            <PackageGrid
              quantities={formData.quantities}
              onQuantityChange={setQuantity}
              onIncrement={(itemCode) => updateQuantity(itemCode, 1)}
              onDecrement={(itemCode) => updateQuantity(itemCode, -1)}
            />
          </div>

          <div className="column">
            <h3>Products</h3>
            {productItemsWithSubs.topLevelItems.map(item => (
              <ItemWithSubProducts
                key={item.code}
                item={item}
                subProducts={productItemsWithSubs.subProductsByParent[item.code] || []}
                quantities={formData.quantities}
                onQuantityChange={setQuantity}
                onIncrement={(itemCode) => updateQuantity(itemCode, 1)}
                onDecrement={(itemCode) => updateQuantity(itemCode, -1)}
              />
            ))}
          </div>

          <div className="column">
            <h3>Family Variants</h3>
            {familyItemsWithSubs.topLevelItems.map(item => (
              <ItemWithSubProducts
                key={item.code}
                item={item}
                subProducts={familyItemsWithSubs.subProductsByParent[item.code] || []}
                quantities={formData.quantities}
                onQuantityChange={setQuantity}
                onIncrement={(itemCode) => updateQuantity(itemCode, 1)}
                onDecrement={(itemCode) => updateQuantity(itemCode, -1)}
              />
            ))}
          </div>

          <div className="column">
            <h3>Team Variants</h3>
            {teamItemsWithSubs.topLevelItems.map(item => (
              <ItemWithSubProducts
                key={item.code}
                item={item}
                subProducts={teamItemsWithSubs.subProductsByParent[item.code] || []}
                quantities={formData.quantities}
                onQuantityChange={setQuantity}
                onIncrement={(itemCode) => updateQuantity(itemCode, 1)}
                onDecrement={(itemCode) => updateQuantity(itemCode, -1)}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
