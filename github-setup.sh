#!/bin/bash

# GitHub Setup Helper Script for Modeling Synthesizer
# This script helps you push your project to GitHub

echo "🚀 Modeling Synthesizer - GitHub Setup Helper"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the modeling-synthesizer directory"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git is not initialized. Please run 'git init' first"
    exit 1
fi

# Get GitHub username
echo "📝 Please enter your GitHub username:"
read -p "Username: " github_username

if [ -z "$github_username" ]; then
    echo "❌ Error: GitHub username cannot be empty"
    exit 1
fi

# Construct repository URL
repo_url="https://github.com/$github_username/modeling-synthesizer.git"

echo ""
echo "🔗 Repository URL: $repo_url"
echo ""

# Check if remote already exists
if git remote get-url origin &>/dev/null; then
    echo "⚠️  Remote 'origin' already exists. Removing it..."
    git remote remove origin
fi

# Add remote
echo "📡 Adding remote origin..."
git remote add origin "$repo_url"

# Set main branch and push
echo "🚀 Pushing to GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your project has been pushed to GitHub!"
    echo ""
    echo "🌐 Next steps:"
    echo "1. Go to: https://github.com/$github_username/modeling-synthesizer"
    echo "2. Click 'Settings' tab"
    echo "3. Click 'Pages' in the left sidebar"
    echo "4. Under 'Source', select 'GitHub Actions'"
    echo "5. Your site will be available at: https://$github_username.github.io/modeling-synthesizer/"
    echo ""
    echo "📋 The GitHub Actions workflow will automatically deploy your site when you push changes!"
else
    echo ""
    echo "❌ Error: Failed to push to GitHub"
    echo "Please make sure:"
    echo "1. You've created the repository 'modeling-synthesizer' on GitHub"
    echo "2. The repository is public"
    echo "3. You have the correct permissions"
    echo "4. Your GitHub credentials are set up correctly"
fi
