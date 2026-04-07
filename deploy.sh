#!/bin/bash

# Kirobox Deployment Helper Script

echo "🚀 Kirobox Deployment Helper"
echo "=============================="
echo ""

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "Please commit or stash your changes before deploying"
    git status -s
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# If not on main, offer to merge
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo ""
    echo "You are not on the main branch."
    echo "Would you like to:"
    echo "1) Merge $CURRENT_BRANCH into main and deploy"
    echo "2) Deploy current branch as-is"
    echo "3) Cancel"
    read -p "Enter your choice (1-3): " choice

    case $choice in
        1)
            echo "Switching to main..."
            git checkout main
            echo "Merging $CURRENT_BRANCH into main..."
            git merge $CURRENT_BRANCH
            if [ $? -ne 0 ]; then
                echo "❌ Merge failed. Please resolve conflicts manually."
                exit 1
            fi
            git push origin main
            echo "✅ Merged and pushed to main"
            ;;
        2)
            echo "Deploying from $CURRENT_BRANCH..."
            git push origin $CURRENT_BRANCH
            ;;
        3)
            echo "Deployment cancelled"
            exit 0
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
else
    echo "Pushing to main..."
    git push origin main
fi

echo ""
echo "✅ Code pushed to GitHub"
echo ""
echo "📦 Next steps:"
echo ""
echo "BACKEND (Render):"
echo "  1. Go to https://dashboard.render.com"
echo "  2. Your service should auto-deploy from main branch"
echo "  3. Check logs for any errors"
echo "  4. Test: curl https://your-backend.onrender.com/api/home"
echo ""
echo "FRONTEND (Vercel):"
echo "  1. Go to https://vercel.com/dashboard"
echo "  2. Your deployment should trigger automatically"
echo "  3. Check deployment logs"
echo "  4. Visit your site when deployment completes"
echo ""
echo "If this is your first deployment, see DEPLOYMENT_GUIDE.md"
echo ""
