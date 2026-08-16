.PHONY: build publish-vscode publish-openvsx publish clean all

all: build

# 'build' ahora depende de 'clean', así que siempre limpiará antes de empaquetar
build: clean
	bun run package

# Las tareas de publicación solo ejecutan su comando correspondiente
publish-vscode:
	bun run publish:vscode

publish-openvsx:
	bun run publish:openvsx

# 'publish' ejecuta build una sola vez (que ya incluye el clean) y luego publica en ambos sitios
publish: build publish-vscode publish-openvsx

clean:
	rm -vf dlunire-envtype-*.vsix