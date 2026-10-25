import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }, { width: 320, height: 568 }]) {
  test(`gallery controls stay compact and usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const previous = page.getByRole('button', { name: 'Document précédent de la galerie', exact: true });
    const next = page.getByRole('button', { name: 'Document suivant de la galerie', exact: true });
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    await expect(page.getByText('LePapayer', { exact: true })).toBeVisible();
    await expect(page.getByText(/Balayez depuis le bord/)).toHaveCount(0);
    const caption = await page.locator('.gallery-caption').boundingBox();
    const top = await previous.boundingBox();
    const bottom = await next.boundingBox();
    const language = await page.getByRole('combobox', { name: 'Langue' }).boundingBox();
    expect(caption!.height).toBeLessThanOrEqual(48);
    expect(caption!.x + caption!.width).toBeLessThan(top!.x);
    expect(top!.y).toBeLessThanOrEqual(16);
    expect(bottom!.y + bottom!.height).toBeGreaterThanOrEqual(viewport.height - 16);
    expect(top!.x + top!.width).toBeLessThan(language!.x);
    expect(top!.height).toBeGreaterThanOrEqual(44);
    expect(bottom!.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole('button', { name: 'Point de vue suivant', exact: true })).toBeVisible();
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Salouis', { exact: true })).toBeVisible();
    await expect(next).toBeDisabled();
    await expect(previous).toBeEnabled();
    await expect(previous).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('LePapayer', { exact: true })).toBeVisible();
    await expect(next).toBeFocused();
    await page.locator('.gallery-caption > strong').click();
    // Keep layout coverage independent of external model downloads.
    await page.screenshot({ path: test.info().outputPath(`gallery-${viewport.width}-fr.png`) });
    await page.getByRole('combobox', { name: 'Langue' }).selectOption('en');
    await expect(page.getByRole('button', { name: 'Next gallery document', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Copy link to LePapayer', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /Link copied|Copy the link below/ })).toBeVisible();
    expect((await page.locator('.gallery-caption').boundingBox())!.height).toBeLessThanOrEqual(48);
    await page.screenshot({ path: test.info().outputPath(`gallery-${viewport.width}-share.png`) });
    await page.goto('/?gallery=salouis');
    await expect(page.getByRole('button', { name: 'Next gallery document', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Back to gallery', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back to gallery', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Previous gallery document', exact: true })).toBeEnabled();
  });
}

test('long titles and clipboard failure do not expand or obstruct the mobile controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => {
    localStorage.setItem('xyzdsl-gallery', JSON.stringify([{ id: 'long-title', title: 'Maison au bord de la mer — terrasse et jardin', source: '"+0+1/+0+1/+0+1":"color: blue"' }]));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Denied')) }, configurable: true });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Document suivant de la galerie', exact: true })).toHaveCount(0);
  const caption = page.locator('.gallery-caption');
  expect((await caption.boundingBox())!.height).toBeLessThanOrEqual(48);
  await page.getByRole('button', { name: /Copier le lien vers Maison/ }).click();
  const link = page.getByRole('textbox', { name: /Lien de partage de Maison/ });
  await expect(link).toBeVisible();
  const box = (await link.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  expect((await caption.boundingBox())!.height).toBeLessThanOrEqual(48);
  await page.screenshot({ path: test.info().outputPath('gallery-320-fallback.png') });
});
