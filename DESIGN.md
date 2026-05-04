---
version: alpha
name: GitHub Deploy Center Material Dark
description: A compact Material UI design system for a GitHub deployment operations console.
colors:
  background: "#424242"
  surface: "#212121"
  surface-variant: "#303030"
  surface-container: "#2a2a2a"
  outline: "#3d3d3d"
  primary: "#4caf50"
  on-primary: "#000000"
  primary-container: "#1b5e20"
  on-primary-container: "#c8e6c9"
  secondary: "#9c27b0"
  on-secondary: "#ffffff"
  secondary-container: "#4a148c"
  on-secondary-container: "#e1bee7"
  error: "#f44336"
  on-error: "#000000"
  warning: "#ffbf5f"
  on-warning: "#000000"
  info: "#73c9f5"
  on-info: "#000000"
  text-primary: "#ffffff"
  text-secondary: "#bdbdbd"
  text-disabled: "#9e9e9e"
typography:
  headline-lg:
    fontFamily: Roboto, Helvetica, Arial, sans-serif
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0px
  title-lg:
    fontFamily: Roboto, Helvetica, Arial, sans-serif
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: 0px
  title-md:
    fontFamily: Roboto, Helvetica, Arial, sans-serif
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: 0px
  body-md:
    fontFamily: Roboto, Helvetica, Arial, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  label-md:
    fontFamily: Roboto, Helvetica, Arial, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0px
  button:
    fontFamily: Roboto, Helvetica, Arial, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.75
    letterSpacing: 0px
rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 10px
  full: 9999px
spacing:
  micro: 4px
  xs: 6px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  app-shell:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-primary}"
  surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
  surface-muted:
    backgroundColor: "{colors.surface-variant}"
    textColor: "{colors.text-secondary}"
  surface-container:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.text-primary}"
  divider:
    backgroundColor: "{colors.outline}"
    height: 1px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: 8px
  secondary-container:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    rounded: "{rounded.md}"
    padding: 8px
  status-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    rounded: "{rounded.sm}"
    padding: 4px
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.on-warning}"
    rounded: "{rounded.sm}"
    padding: 4px
  status-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.on-info}"
    rounded: "{rounded.sm}"
    padding: 4px
  disabled-control:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-disabled}"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    size: 40px
  menu-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 8px
  sidebar-nav-item-selected:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
---

# GitHub Deploy Center Design System

## Overview

GitHub Deploy Center is a focused operations tool for people who repeatedly inspect releases, compare deployment state, and trigger GitHub Actions workflows. The interface should feel like a Material UI control room: dark, compact, readable, and direct.

Material UI is the implementation baseline. Prefer native MUI components, variants, typography, spacing, color props, focus behavior, and interaction states before adding local styling. Custom styling should clarify hierarchy or density; it should not fight the component library.

## Colors

The product uses a dark Material palette with green as the primary action color and purple as the secondary configuration color.

- **Background (#424242):** App shell background.
- **Surface (#212121):** Primary paper, dialogs, menus, and contained panels.
- **Primary (#4caf50):** Primary actions such as creating an application or saving a change.
- **Secondary (#9c27b0):** Configuration and edit affordances.
- **Status accents:** Green, amber, blue, and red are reserved for deployment status, warning, info, and failure.

Use semantic MUI color props (`primary`, `secondary`, `error`) whenever possible instead of hard-coded component colors. Only use explicit hex values for domain-specific status chips and data visualization.

## Typography

Use the MUI default Roboto stack and Material typography scale. Keep type compact and scannable; this is an operational app, not a marketing surface.

Button source labels should be written in sentence case, such as `New application`. Let MUI render Button casing from the active theme. Do not set `textTransform: none`, `lowercase`, or custom casing on ordinary MUI buttons.

Preserve exact casing for user data: GitHub handles, repository names, environment names, branch names, tags, workflow names, and application names must not be transformed. If a control displays data text and also behaves like a button, use a targeted exception or a lower-level component such as `ButtonBase`.

## Layout

Use an 8px spacing rhythm with 4px micro-adjustments where needed for dense tool surfaces. Main content should remain in a constrained `Container` with a dark `Paper` shell.

Keep the application navigation as a left sidebar on desktop and a single-column stack on mobile. Put primary workspace creation at the top of the sidebar. Secondary workspace actions belong in menus so the application list remains the main scanning surface.

## Elevation & Depth

Favor tonal separation, borders, and state color over heavy shadows. Menus and dialogs may use standard MUI elevation. In-page surfaces should generally stay flat and use subtle borders or alpha fills to indicate grouping.

## Shapes

Use modest Material rounding. Buttons, cards, status chips, and navigation items should stay near 4px to 8px radius unless the component is inherently circular, such as icon buttons.

Do not create nested card frames. Use cards for repeated items, dialogs, and real contained tools; use layout spacing and section structure for everything else.

## Components

**Buttons:** Use MUI `Button` for commands. The primary action on a surface should be `variant="contained"` and `color="primary"`. Secondary actions should be text, outlined, icon buttons, or menu items depending on density. Keep labels short and action-led.

**Menus:** Use MUI `Menu` for overflow actions and account/application management actions. Menu items should have recognizable Material icons when the action benefits from quick scanning.

**Sidebar navigation:** Application navigation items should be dense, left-aligned, and stable in size. The selected item may use a muted primary-container treatment and a color rail. Status chips inside nav items should remain compact and must not shift layout.

**Dialogs:** Use existing MUI dialog sizing and form patterns. Dialogs should focus on the task and keep explanatory text short.

**Status chips:** Use high-contrast color tokens and tooltips for status details. Do not use repo owner or metadata copy as a substitute for deployment state.

## Do's and Don'ts

- Do use MUI defaults before local `sx` overrides.
- Do keep ordinary Button casing aligned with the MUI theme.
- Do preserve exact casing for GitHub and deployment data.
- Do keep primary actions visible and secondary actions tucked into menus when space is tight.
- Do test advanced interaction with focused UI tests.
- Don't force lowercase labels on Material buttons.
- Don't create new wrapper components when a MUI component plus a small `sx` prop does the job.
- Don't use decorative cards, gradients, or oversized hero-style typography in the operational workspace.
- Don't let text overflow, overlap, or resize fixed-format controls.
