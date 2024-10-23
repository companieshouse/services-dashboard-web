LOCAL_ENV_FILE='source.me.sh'
DOCKER_ENV_FILE='env.list'
source "${LOCAL_ENV_FILE}"

> "${DOCKER_ENV_FILE}"

grep '^ *export' "${LOCAL_ENV_FILE}" | awk '{print $2}' | cut -d'=' -f1 | while read VAR; do

  VALUE=$(printenv $VAR)  # Get the value of the var from the current env
  if [ ! -z "$VALUE" ]; then
    echo "$VAR=$VALUE" >> "${DOCKER_ENV_FILE}"
  fi
done
