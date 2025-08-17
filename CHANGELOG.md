# Changelog

## [1.2.0] - 2025-08-17

### Added
- **Major Feature**: Complete device group membership management
- Device search functionality with operating system information display
- Tab-based interface with separate "Users" and "Devices" tabs
- Device group fetching, copying, and removal capabilities
- Smart device search with auto-complete dropdown
- Device-specific group filtering and type classification
- All existing user functionality now available for devices:
  - Fetch device group memberships
  - Copy groups between devices
  - Remove devices from multiple groups
  - Pre-flight membership checks for devices
  - Detailed status reporting for device operations

### Changed
- Updated extension version to 1.2.0
- Enhanced description to highlight dual user/device management
- Added `Device.Read.All` permission scope for device operations
- Improved UI with consistent styling between Users and Devices tabs
- Updated documentation to reflect device management capabilities

### Technical
- Added device-specific JavaScript functions parallel to user functions
- Enhanced CSS with device groups list styling matching user groups
- Implemented device dropdown rendering and search functionality
- Added device group membership validation and error handling

## [1.1.0] - 2025-07-15

### Added
- **New Feature**: Remove users from multiple groups functionality
- Added "Remove from Selected Groups" button with destructive action styling (red button)
- Confirmation dialog before removing users from groups to prevent accidental removals
- Enhanced UI with group action buttons that appear after fetching groups

### Changed
- Updated extension name from "Group Membership Copier" to "Group Membership Manager"
- Improved button layout with action buttons grouped together
- Enhanced documentation with removal functionality instructions

### Security
- Added confirmation prompt for destructive remove actions
- Maintains existing security measures for OAuth 2.0 + PKCE authentication

## [1.0.0] - 2025-07-01

### Added
- Initial release
- Copy group memberships between users
- OAuth 2.0 + PKCE authentication
- Smart user search with auto-complete
- Intelligent group filtering
- Admin role detection
- Multi-tenant support
