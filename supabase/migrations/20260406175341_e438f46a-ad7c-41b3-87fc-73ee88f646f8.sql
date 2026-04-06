-- Clean up duplicate renders for asset c1b4f235-6a27-4bea-9dd6-07e770ddc422
-- Keep only the latest one (with image)
DELETE FROM asset_template_renders 
WHERE asset_id = 'c1b4f235-6a27-4bea-9dd6-07e770ddc422' 
AND id != '1a85f46d-de5c-4911-bdb0-0eeb32a3be82';