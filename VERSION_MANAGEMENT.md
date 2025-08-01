# Version Management Guide

This document outlines the version management system for the Traders Journal application.

## Current Version
- **Version**: 0.1.0
- **Status**: Production Ready
- **Last Updated**: 2024-12-19

## Version Bumping System

### Semantic Versioning
We follow [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes, incompatible API changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Available Commands

#### Version Bumping
```bash
# Patch version (0.1.0 → 0.1.1) - Bug fixes
npm run version:patch

# Minor version (0.1.0 → 0.2.0) - New features
npm run version:minor

# Major version (0.1.0 → 1.0.0) - Breaking changes
npm run version:major
```

#### Release Commands (Bump + Push)
```bash
# Release patch version
npm run release:patch

# Release minor version
npm run release:minor

# Release major version
npm run release:major
```

#### Utility Commands
```bash
# Get current version
npm run version:get

# Generate changelog
npm run changelog

# Generate initial changelog
npm run changelog:first
```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/) for automatic changelog generation:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Build system changes
- **ci**: CI/CD changes
- **chore**: Maintenance tasks
- **revert**: Reverting previous commits

### Examples
```bash
# Feature
git commit -m "feat: add new trading analysis tool"

# Bug fix
git commit -m "fix: resolve mobile navigation issue"

# Breaking change
git commit -m "feat!: remove deprecated API endpoint"

# With scope
git commit -m "feat(auth): add two-factor authentication"
```

## Release Process

### 1. Development Workflow
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and commit using conventional commits
3. Push branch: `git push origin feature/new-feature`
4. Create pull request

### 2. Release Preparation
1. Ensure all tests pass
2. Update CHANGELOG.md if needed
3. Review all commits since last release

### 3. Release Execution
```bash
# For patch release (bug fixes)
npm run release:patch

# For minor release (new features)
npm run release:minor

# For major release (breaking changes)
npm run release:major
```

### 4. Post-Release
1. Verify deployment on Netlify
2. Test production functionality
3. Update release notes on GitHub
4. Notify team of new release

## Automated Features

### Pre-commit Hooks
- **Linting**: Automatically runs ESLint before commits
- **Type Checking**: Ensures TypeScript compilation
- **Formatting**: Maintains code style consistency

### Changelog Generation
- **Automatic**: Generated from conventional commits
- **Formatted**: Follows Keep a Changelog format
- **Categorized**: Groups changes by type

### Git Tags
- **Automatic**: Created for each version bump
- **Semantic**: Follows version numbering
- **Pushed**: Automatically pushed to remote

## Version History

### 0.1.0 (2024-12-19)
- Initial production release
- Complete trading journal functionality
- Mobile-responsive design
- Admin dashboard
- Support system
- Social features

## Best Practices

### When to Bump Versions
- **PATCH**: Bug fixes, minor improvements
- **MINOR**: New features, enhancements
- **MAJOR**: Breaking changes, major rewrites

### Commit Guidelines
- Use conventional commit format
- Be descriptive but concise
- Include scope when relevant
- Reference issues when applicable

### Release Notes
- Update CHANGELOG.md for significant changes
- Include migration guides for breaking changes
- Document new features and improvements
- List known issues if any

## Troubleshooting

### Common Issues
1. **Version conflict**: Ensure no uncommitted changes
2. **Changelog not updating**: Check commit message format
3. **Git tag issues**: Verify remote repository access

### Reset Version
```bash
# Reset to specific version
npm version 0.1.0 --no-git-tag-version
git add package.json
git commit -m "chore: reset version to 0.1.0"
```

## Support

For version management issues:
1. Check this documentation
2. Review conventional commits specification
3. Consult the team for complex scenarios 