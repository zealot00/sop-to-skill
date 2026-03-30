# sop-to-skill

Convert SOP documents to executable AI Agent Skills.

## Install

npm install -g sop-to-skill

## Quick Start

sop-to-skill generate ./SOP-DM-002.md --name "数据核查流程" --output ./output

## Commands

- generate - Generate Skill Package from SOP
- extract - Extract structured data from SOP
- llm-enhance - Enhance extracted data with LLM
- validate - Validate Skill Package structure

## Options

- --llm - Enable LLM enhancement
- --llm-api - LLM API URL (default: http://localhost:11434)
- --llm-model - LLM model name