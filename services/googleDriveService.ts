import { PortfolioData } from '../types';

// These variables are specific to your Google Cloud project.
// Note: For production, it's recommended to load sensitive keys from an environment variable.
const CLIENT_ID = '54041417021-c5fe8lov2tfknpcsu4hu17h5kkkh4b7c.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAonnr61_2bC1iYaXBWodX4bSml9j4rnNc';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Define FILE_NAME constant for Google Drive operations.
const FILE_NAME = 'portfolio-data.json';

// Type declarations for Google APIs loaded from scripts
declare const gapi: any;
declare const google: any;

// The 'google' object is loaded from an external script, and its type is not known to TypeScript without type definitions.
let tokenClient: any | null = null;


/**
 * Waits for the Google API (gapi) and Google Identity Services (google) scripts
 * to load and be available on the window object.
 * @returns A promise that resolves when both APIs are ready.
 */
function waitForGoogleApis(): Promise<void> {
    return new Promise((resolve, reject) => {
        const interval = 100; // ms
        const timeout = 10000; // 10 seconds
        let elapsed = 0;

        const check = () => {
            // Check if both gapi and google.accounts are available.
            if ((window as any).gapi && (window as any).google?.accounts) {
                resolve();
            } else {
                elapsed += interval;
                if (elapsed >= timeout) {
                    reject(new Error("Google API scripts failed to load in time. Check for network issues or script blockers."));
                } else {
                    setTimeout(check, interval);
                }
            }
        };
        check();
    });
}


/**
 * Initializes the Google API client and Google Identity Services.
 * This function handles the complex initialization flow for both GAPI (for API calls)
 * and GSI (for authentication). This version is refactored to be as robust as possible.
 * @param onGapiReady Callback function to execute when GAPI is fully initialized.
 */
export async function initGoogleClient(onGapiReady: () => void): Promise<void> {
  try {
    // 1. Ensure the base Google API scripts have loaded.
    await waitForGoogleApis();

    // 2. Load the specific 'client' library from GAPI.
    await new Promise<void>((resolve, reject) => {
      gapi.load('client', {
        callback: resolve,
        // FIX: The Error constructor was called with two arguments, but the environment's configuration for Error only supports one. Changed to concatenate the error cause into the message string.
        onerror: (err: any) => reject(new Error('Failed to load GAPI client library. Cause: ' + JSON.stringify(err))),
        timeout: 5000,
        ontimeout: () => reject(new Error('Timed out loading GAPI client library.')),
      });
    });

    // 3. Initialize the GAPI client. This is a multi-step process for robustness.
    // First, initialize with just the API Key. This returns a non-standard "thenable".
    await new Promise<void>((resolve, reject) => {
        (gapi.client.init({
            apiKey: API_KEY,
        }) as any).then(resolve, reject);
    });

    // Second, load the specific API discovery document for Google Drive.
    // This returns a standard Promise.
    await gapi.client.load(DISCOVERY_DOC);

    // If we get here, GAPI initialization was successful.
    onGapiReady();

    // 4. Initialize the Google Identity Services (GSI) client for authentication.
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // Callback is handled dynamically by the signIn function.
    });

  } catch (error: any) {
    console.error("A critical error occurred during Google Client initialization:", error);
    const errorMessage = error?.result?.error?.message || error.details || error.message || JSON.stringify(error);
    console.error("Detailed initialization error object:", errorMessage);
  }
}

/**
 * Prompts the user to sign in and authorize the application.
 * @returns A promise that resolves with the user's profile information upon success.
 */
export async function signIn(): Promise<{ name: string; email: string; picture: string; }> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      return reject(new Error("Google Identity Services not initialized."));
    }
    
    tokenClient.callback = async (resp: any) => {
        if (resp.error) {
            return reject(new Error(resp.error));
        }

        try {
            const profileResponse = await gapi.client.request({
                path: 'https://www.googleapis.com/oauth2/v3/userinfo'
            });
            const profile = JSON.parse(profileResponse.body);
            resolve({
                name: profile.name,
                email: profile.email,
                picture: profile.picture
            });
        } catch (err: any) {
            reject(new Error(`Failed to fetch user profile: ${err.message}`));
        }
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Signs the user out of the application.
 */
export function signOut(): void {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {});
    gapi.client.setToken(null);
  }
}

/**
 * Finds the portfolio data file in the appDataFolder.
 * @returns The file ID if found, otherwise null.
 */
async function findPortfolioFileId(): Promise<string | null> {
    try {
        const response = await gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            fields: 'files(id, name)',
            pageSize: 10
        });

        const file = response.result.files.find((f: any) => f.name === FILE_NAME);
        return file ? file.id : null;
    } catch (error: any) {
        console.error("Error listing files:", error);
        throw new Error("Could not search for files in Google Drive.");
    }
}

/**
 * Saves the portfolio data to a file in the user's Google Drive appDataFolder.
 * Creates the file if it doesn't exist, otherwise updates it.
 * @param portfolioData The portfolio data to save.
 */
export async function savePortfolioToDrive(portfolioData: PortfolioData): Promise<void> {
    const fileId = await findPortfolioFileId();
    const content = JSON.stringify(portfolioData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });

    const metadata = {
        name: FILE_NAME,
        mimeType: 'application/json',
        ...(fileId ? {} : { parents: ['appDataFolder'] }),
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);

    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files${fileId ? `/${fileId}` : ''}?uploadType=multipart`;
    const method = fileId ? 'PATCH' : 'POST';

    try {
        await gapi.client.request({
            path: uploadUrl,
            method: method,
            body: formData,
        });
    } catch (error: any) {
        console.error("Error saving to Drive:", error);
        throw new Error("Failed to save data to Google Drive.");
    }
}

/**
 * Loads portfolio data from the file in the user's Google Drive appDataFolder.
 * @returns The parsed portfolio data, or null if the file doesn't exist.
 */
export async function loadPortfolioFromDrive(): Promise<PortfolioData | null> {
    const fileId = await findPortfolioFileId();
    if (!fileId) {
        return null;
    }

    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        return JSON.parse(response.body) as PortfolioData;
    } catch (error: any) {
        console.error("Error loading from Drive:", error);
        throw new Error("Failed to load data from Google Drive.");
    }
}
