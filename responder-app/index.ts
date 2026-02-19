import { registerRootComponent } from 'expo';

// Register background task BEFORE importing App (required for expo-task-manager)
import './src/features/location/locationTask';

import App from './src/App';

registerRootComponent(App);
